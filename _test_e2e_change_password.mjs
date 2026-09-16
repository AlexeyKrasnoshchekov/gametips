// Разовый e2e-тест связки: Next API route /api/auth/change-password ->
// бэкенд POST /prod/change-password. Поднимает изолированный бэкенд
// (prod-роутер на :18000), создаёт временного пользователя в auth-кластере,
// подделывает валидную gt_session куку через lib/auth.js (тот же
// data/auth-secret.txt), стартует `next dev` на свободном порту с
// AUTH_API_URL на изолированный бэкенд и прогоняет сценарий.
// Запуск: node _test_e2e_change_password.mjs (из папки gametips)
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { once } from 'node:events';

const GT = 'c:/Users/krasnoshchekov.al/Desktop/_Projects/gametips';
const SRV = 'c:/Users/krasnoshchekov.al/Desktop/_Projects/gametips-server';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

let failed = 0;
const expect = (name, cond, extra) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} - ${name}${cond ? '' : ' :: ' + JSON.stringify(extra)}`);
  if (!cond) failed++;
};

const req = createRequire(SRV + '/package.json');
const bcrypt = req('bcrypt');
const express = req('express');
const { getAuthConnection } = req(SRV + '/db.js');
const { getUserModel } = req(SRV + '/mongo_schema/User.js');

let backend;
let nextProc = null;
try {
  // 1. Временный пользователь (подтверждён, схема 'sha256')
  const authConn = await getAuthConnection();
  const User = getUserModel(authConn);
  const email = `cp.e2e.${Date.now()}@example.com`;
  const CURRENT = 'oldPassword123';
  const NEW = 'newPassword456';
  await User.create({
    name: 'CP E2E',
    email,
    password: await bcrypt.hash(sha(CURRENT), 10),
    passwordScheme: 'sha256',
    isVerified: true,
    provider: 'email',
  });
  console.log(`temp user created: ${email}`);

  // 2. Изолированный бэкенд (новый код) на :18000
  const app = express();
  app.use(express.json());
  app.use('/prod', req(SRV + '/routes/prod/index.js'));
  backend = app.listen(18000, '127.0.0.1');
  await once(backend, 'listening');
  console.log('isolated backend on :18000');

  // 3. Валидная gt_session кука (тот же секрет, что читает next dev из data/)
  process.chdir(GT);
  const authLib = await import('file:///' + GT + '/lib/auth.js');
  const cookie = `${authLib.SESSION_COOKIE}=${authLib.createSessionToken({
    id: 'e2e-' + Date.now(),
    email,
    name: 'CP E2E',
    provider: 'email',
  })}`;

  // 4. next dev на фиксированном порту, AUTH_API_URL -> изолированный бэкенд
  nextProc = spawn(
    'cmd.exe',
    ['/c', 'npm', 'run', 'dev', '--', '-p', '3211'],
    { cwd: GT, env: { ...process.env, AUTH_API_URL: 'http://127.0.0.1:18000/prod' }, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let out = '';
  nextProc.stdout.on('data', (d) => (out += d));
  nextProc.stderr.on('data', (d) => (out += d));
  let port = null;
  for (let i = 0; i < 90 && !port; i++) {
    await sleep(1000);
    const m = out.match(/localhost:(\d+)/);
    if (m) port = m[1];
  }
  if (!port) {
    console.log('=== next dev output ===\n' + out.slice(-3000));
    throw new Error('next dev did not report a port');
  }
  console.log(`next dev ready on :${port}`);
  const base = `http://127.0.0.1:${port}`;

  const postApi = (headers, body) =>
    fetch(`${base}/api/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

  // A. Без сессии -> 401
  let r = await postApi({}, { currentPasswordHash: sha(CURRENT), newPasswordHash: sha(NEW) });
  expect('no session -> 401', r.status === 401, r);

  // B. С сессией, но без полей -> 400
  r = await postApi({ Cookie: cookie }, {});
  expect('session, empty body -> 400', r.status === 400, r);

  // C. Полный сценарий: смена пароля -> 200
  r = await postApi({ Cookie: cookie }, { currentPasswordHash: sha(CURRENT), newPasswordHash: sha(NEW) });
  expect('change password -> 200', r.status === 200, r);

  // D. Логин с новым паролем через изолированный бэкенд -> 200
  r = await fetch('http://127.0.0.1:18000/prod/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, passwordHash: sha(NEW) }),
  }).then(async (x) => ({ status: x.status, body: await x.json().catch(() => null) }));
  expect('backend login with new password -> 200', r.status === 200, r);

  // E. Повторная смена со старым паролем -> 401 (пароль уже новый)
  r = await postApi({ Cookie: cookie }, { currentPasswordHash: sha(CURRENT), newPasswordHash: sha('oneMorePass999') });
  expect('old current password -> 401', r.status === 401, r);

  // Очистка
  const del = await User.deleteOne({ email });
  console.log(`cleanup deleted=${del.deletedCount}`);
  console.log(failed === 0 ? 'ALL E2E TESTS PASSED' : `${failed} E2E TEST(S) FAILED`);
  process.exitCode = failed ? 1 : 0;
} catch (e) {
  console.error('E2E ERROR:', e);
  process.exitCode = 1;
} finally {
  if (nextProc) {
    try { execSync(`taskkill /PID ${nextProc.pid} /T /F`); } catch {}
  }
  if (backend) backend.close();
  // Принудительный выход: keep-alive сокеты undici не дают event loop
  // завершиться после backend.close() (cleanup выше уже выполнен).
  setTimeout(() => process.exit(process.exitCode || 0), 500).unref?.();
  process.exit(process.exitCode || 0);
}
