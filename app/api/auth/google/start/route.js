import { NextResponse } from 'next/server';
import {
  OAUTH_STATE_COOKIE,
  createOAuthState,
  oauthStateCookieOptions,
} from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const url = new URL(req.url);
  // Канонический origin сайта. AUTH_ORIGIN обязателен на Netlify: внутри
  // функции req.url может указывать на внутренний deploy-домен (*.netlify.app),
  // а redirect_uri и все редиректы должны вести на публичный домен.
  const siteOrigin = (process.env.AUTH_ORIGIN || url.origin).replace(/\/+$/, '');

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/?authError=google_not_configured', siteOrigin));
  }

  // Нормализация хоста: если start открыт на другом хосте (www, preview-домен
  // *.netlify.app) — перезапускаем флоу с канонического, чтобы кука state и
  // ответ Google жили на одном домене.
  try {
    if (new URL(siteOrigin).host !== url.host) {
      return NextResponse.redirect(new URL('/api/auth/google/start', siteOrigin));
    }
  } catch {
    // некорректный AUTH_ORIGIN — продолжаем как есть
  }

  // CSRF protection: подписанный state с TTL; дублируем его же в короткой куке
  // — callback сверит куку, только если она доехала.
  const state = createOAuthState();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${siteOrigin}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    // Always show the account chooser — this is what makes sign-up one click.
    prompt: 'select_account',
  });

  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  res.cookies.set(OAUTH_STATE_COOKIE, state, oauthStateCookieOptions());
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
