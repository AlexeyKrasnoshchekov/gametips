import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { OAUTH_STATE_COOKIE, oauthStateCookieOptions } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const url = new URL(req.url);

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/?authError=google_not_configured', url.origin));
  }

  // CSRF protection: a random state stored in a short-lived cookie must come
  // back from Google unchanged in the callback.
  const state = randomBytes(16).toString('base64url');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${url.origin}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    // Always show the account chooser — this is what makes sign-up one click.
    prompt: 'select_account',
  });

  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  res.cookies.set(OAUTH_STATE_COOKIE, state, oauthStateCookieOptions());
  return res;
}
