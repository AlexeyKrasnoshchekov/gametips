// Server-only helpers for talking to the GameTips auth backend
// (gametips-server: POST /prod/register and POST /prod/login).
// The backend stores users in MongoDB with bcrypt-hashed passwords and
// returns a short-lived JWT — we only use it to confirm the credentials;
// the web-app session itself stays in the gt_session cookie.
// NOTE: never import this module from client components.

const AUTH_API_URL = (process.env.AUTH_API_URL || 'https://api.gametips.bet/prod').replace(/\/+$/, '');
const AUTH_TIMEOUT_MS = 15000;

// POSTs JSON to the backend and normalizes every outcome into
// { ok, status, data } so callers never have to handle network quirks.
export async function callAuthBackend(path, payload) {
  try {
    const res = await fetch(`${AUTH_API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });

    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    if (err && err.name === 'TimeoutError') {
      return {
        ok: false,
        status: 504,
        data: { message: 'Auth service timed out. Please try again.' },
      };
    }
    return {
      ok: false,
      status: 502,
      data: { message: 'Auth service is unreachable. Please try again later.' },
    };
  }
}

// Backend user ({ id, name, email }) -> web-app session user shape.
// provider: 'email' для обычного логина, 'google' для входа через OAuth.
export function sessionUserFromBackend(backendUser, provider = 'email') {
  if (!backendUser || !backendUser.id || !backendUser.email) return null;
  const email = String(backendUser.email).trim().toLowerCase();
  return {
    id: String(backendUser.id),
    email,
    name: String(backendUser.name || '').trim() || email.split('@')[0],
    provider,
  };
}

// Google sign-in sync: вызывается из /api/auth/google/callback после того,
// как Google подтвердил профиль. Создаёт/привязывает пользователя в MongoDB
// (gametips-server POST /prod/google-auth) и возвращает тот же формат
// { ok, status, data }, что и callAuthBackend. Запрос аутентифицируется
// общим секретом AUTH_INTERNAL_SECRET — без него эндпоинт отклоняет вызовы,
// чтобы никто не мог войти под произвольным email напрямую.
export async function syncGoogleUser({ email, name, googleId }) {
  const internalSecret = process.env.AUTH_INTERNAL_SECRET;
  if (!internalSecret) {
    return {
      ok: false,
      status: 503,
      data: { message: 'Google sign-in is not configured (AUTH_INTERNAL_SECRET is missing).' },
    };
  }

  try {
    const res = await fetch(`${AUTH_API_URL}/google-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': internalSecret,
      },
      body: JSON.stringify({ email, name, googleId }),
      cache: 'no-store',
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });

    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    if (err && err.name === 'TimeoutError') {
      return {
        ok: false,
        status: 504,
        data: { message: 'Auth service timed out. Please try again.' },
      };
    }
    return {
      ok: false,
      status: 502,
      data: { message: 'Auth service is unreachable. Please try again later.' },
    };
  }
}

