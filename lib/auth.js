// Server-only authentication helpers. Deliberately dependency-free:
// node:crypto for password hashing (scrypt) and signed session cookies,
// a JSON file as the user store for this self-hosted deployment.
// NOTE: never import this module from client components.

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const SESSION_COOKIE = 'gt_session';
const OAUTH_STATE_COOKIE = 'gt_oauth_state';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SECRET_FILE = path.join(DATA_DIR, 'auth-secret.txt');

// ---------------------------------------------------------------------------
// User store (JSON file with atomic replace-on-write)
// ---------------------------------------------------------------------------

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeUsers(users) {
  ensureDataDir();
  const tmp = `${USERS_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(users, null, 2));
  fs.renameSync(tmp, USERS_FILE);
}

export function findUserByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return null;
  return readUsers().find((u) => u.email === normalized) || null;
}

export function verifyPassword(user, password) {
  if (!user || !user.salt || !user.hash) return false;
  const candidate = scryptSync(String(password), user.salt, 64);
  const stored = Buffer.from(user.hash, 'hex');
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

export function publicUser(user) {
  if (!user) return null;
  return { id: user.id, email: user.email, name: user.name, provider: user.provider };
}

// ---------------------------------------------------------------------------
// Signed session tokens (HMAC-SHA256 over a base64url payload)
// ---------------------------------------------------------------------------

function getSessionSecret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  try {
    ensureDataDir();
    if (fs.existsSync(SECRET_FILE)) return fs.readFileSync(SECRET_FILE, 'utf8').trim();
    const secret = randomBytes(32).toString('hex');
    fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
    return secret;
  } catch (err) {
    // Read-only filesystem (e.g. Netlify serverless): fall back to an ephemeral
    // per-process secret so auth keeps working instead of crashing with 500.
    // NOTE: sessions won't survive cold starts unless AUTH_SECRET is set in env.
    console.warn(
      '[auth] Could not persist auth secret to disk, using ephemeral secret.',
      err && err.message
    );
    return randomBytes(32).toString('hex');
  }
}

export function createSessionToken(user) {
  const payload = Buffer.from(
    JSON.stringify({
      uid: user.id,
      email: user.email,
      name: user.name,
      // 'email' | 'google' — чтобы /api/auth/me возвращал корректный провайдер
      provider: user.provider || 'email',
      exp: Date.now() + SESSION_TTL_MS,
    }),
  ).toString('base64url');
  const sig = createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data || typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
    // Opt-in via AUTH_SECURE_COOKIES=true once the site is served over HTTPS.
    secure: process.env.AUTH_SECURE_COOKIES === 'true',
  };
}

export function clearSessionCookieOptions() {
  return { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 };
}

export function oauthStateCookieOptions() {
  return { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 };
}

// ---------------------------------------------------------------------------
// Signed OAuth state (stateless CSRF protection)
// ---------------------------------------------------------------------------
// Схема «random state только в куке» хрупка на серверлессе: кука может не
// доехать до callback (строгий браузер, другой хост, прокси). Поэтому state —
// самоподписанный HMAC-токен с TTL: подпись проверяется без хранилища, а кука
// служит дополнительной проверкой (если она дошла).
const STATE_TTL_MS = 10 * 60 * 1000;

function getOAuthStateSecret() {
  return (
    process.env.AUTH_STATE_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.AUTH_INTERNAL_SECRET ||
    null
  );
}

export function createOAuthState() {
  const payload = Buffer.from(
    JSON.stringify({
      exp: Date.now() + STATE_TTL_MS,
      n: randomBytes(12).toString('base64url'),
    }),
  ).toString('base64url');
  const secret = getOAuthStateSecret();
  const sig = createHmac('sha256', secret || getSessionSecret())
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyOAuthState(state) {
  if (!state || typeof state !== 'string' || state.length > 512) return false;
  const dot = state.lastIndexOf('.');
  if (dot <= 0) return false;
  const payload = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const secret = getOAuthStateSecret();
  const expected = createHmac('sha256', secret || getSessionSecret())
    .update(payload)
    .digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return !!data && typeof data.exp === 'number' && data.exp >= Date.now();
  } catch {
    return false;
  }
}

export { OAUTH_STATE_COOKIE };
