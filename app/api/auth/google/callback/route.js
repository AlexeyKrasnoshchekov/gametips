import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  attachGoogleProfile,
  createSessionToken,
  publicUser,
  sessionCookieOptions,
} from '@/lib/auth';

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
  const fail = (reason) => NextResponse.redirect(new URL(`/?authError=${reason}`, url.origin));

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const store = await cookies();
  const expectedState = store.get(OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
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
        redirect_uri: `${url.origin}/api/auth/google/callback`,
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

  if (!email || profile.email_verified === false) return fail('google_profile_error');

  const user = attachGoogleProfile({ email, name: profile.name || profile.given_name });
  if (!user) return fail('google_profile_error');

  const res = NextResponse.redirect(new URL('/', url.origin));
  res.cookies.set(SESSION_COOKIE, createSessionToken(user), sessionCookieOptions());
  res.cookies.set(OAUTH_STATE_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
