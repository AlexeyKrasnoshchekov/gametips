import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifyOAuthState,
} from '@/lib/auth';
import { sessionUserFromBackend, syncGoogleUser } from '@/lib/authApi';

export const runtime = 'nodejs';

function decodeIdToken(idToken) {
  try {
    const payload = String(idToken).split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export async function GET(req) {
  const url = new URL(req.url);
  // Канонический origin: внутри Netlify-функции url.origin может указывать на
  // внутренний deploy-домен (*.netlify.app), поэтому ВСЕ редиректы (и ошибки,
  // и успех) строим только от siteOrigin — иначе пользователь улетает на домен,
  // где его сессия и куки не работают.
  const siteOrigin = (process.env.AUTH_ORIGIN || url.origin).replace(/\/+$/, '');
  const fail = (reason) => {
    const res = NextResponse.redirect(new URL(`/?authError=${reason}`, siteOrigin));
    res.headers.set('Cache-Control', 'no-store');
    return res;
  };

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const store = await cookies();
  const stateCookie = store.get(OAUTH_STATE_COOKIE)?.value;

  // Обязательна подпись и срок действия state (CSRF). Кука — дополнительная
  // проверка: сверяем только если она доехала; её отсутствие флоу не ломает.
  if (!code || !state || !verifyOAuthState(state)) {
    return fail('invalid_state');
  }
  if (stateCookie && stateCookie !== state) {
    return fail('invalid_state');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail('google_not_configured');

  let tokenRes;
  try {
    tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${siteOrigin}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });
  } catch {
    return fail('google_unreachable');
  }
  if (!tokenRes.ok) return fail('google_token_error');

  const tokens = await tokenRes.json().catch(() => null);
  const profile = tokens?.id_token ? decodeIdToken(tokens.id_token) : null;
  const email = profile?.email;

  // Токен получен напрямую с token-эндпоинта Google (аутентифицирован
  // client_secret), поэтому подпись не проверяем — но aud должен быть наш.
  if (!email || profile.email_verified === false) return fail('google_profile_error');
  if (profile.aud && profile.aud !== clientId) return fail('google_profile_error');

  // Пользователь хранится в MongoDB на бэкенде (та же база, что и у
  // email-регистрации): создаём/привязываем аккаунт и берём его данные.
  const sync = await syncGoogleUser({
    email,
    name: profile.name || profile.given_name,
    googleId: profile.sub,
  });
  if (!sync.ok || !sync.data?.user) return fail('google_backend_error');

  const user = sessionUserFromBackend(sync.data.user, 'google');
  if (!user) return fail('google_profile_error');

  const res = NextResponse.redirect(new URL('/', siteOrigin));
  res.cookies.set(SESSION_COOKIE, createSessionToken(user), sessionCookieOptions());
  res.cookies.set(OAUTH_STATE_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
