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

  // The backend (gametips-server) owns the credential check 111 (bcrypt compare
  // against the MongoDB user store) — forward the credentials as-is.
  const result = await callAuthBackend('/login', {
    email: String(body?.email || ''),
    password: String(body?.password || ''),
  });

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
