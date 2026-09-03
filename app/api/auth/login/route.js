import { NextResponse } from 'next/server';
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from '@/lib/auth';
import { callAuthBackend, sessionUserFromBackend } from '@/lib/authApi';

export const runtime = 'nodejs';

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // Клиент (новая версия) считает SHA-256 пароля в браузере и присылает только
  // passwordHash — открытый пароль не передаётся по сети. Бэкенд
  // (gametips-server) bcrypt-ит полученный хэш и сверяет с MongoDB.
  // Старые закэшированные клиенты ещё присылают открытый пароль в password —
  // на переходный период пробрасываем его как есть, бэкенд понимает оба варианта.
  const passwordHash =
    typeof body?.passwordHash === 'string' && body.passwordHash
      ? body.passwordHash.trim().toLowerCase()
      : null;
  const legacyPassword =
    typeof body?.password === 'string' && body.password ? body.password : null;

  if (!passwordHash && !legacyPassword) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const result = await callAuthBackend(
    '/login',
    passwordHash
      ? { email: String(body?.email || ''), passwordHash }
      : { email: String(body?.email || ''), password: legacyPassword },
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.data?.message || 'Invalid email or password.' },
      { status: result.status },
    );
  }

  const user = sessionUserFromBackend(result.data?.user);
  if (!user) {
    return NextResponse.json(
      { error: 'Unexpected response from the auth service. Please try again.' },
      { status: 502 },
    );
  }

  const res = NextResponse.json({ user });
  res.cookies.set(SESSION_COOKIE, createSessionToken(user), sessionCookieOptions());
  return res;
}
