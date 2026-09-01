import { NextResponse } from 'next/server';
import { callAuthBackend } from '@/lib/authApi';

export const runtime = 'nodejs';

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // The backend (gametips-server) owns validation, bcrypt hashing and the
  // MongoDB user store — forward the credentials as-is and map its
  // `{ message }` errors onto the `{ error }` shape the UI expects.
  const result = await callAuthBackend('/register', {
    name: String(body?.name || ''),
    email: String(body?.email || ''),
    password: String(body?.password || ''),
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.data?.message || 'Could not create the account. Please try again.' },
      { status: result.status },
    );
  }

  // Email verification flow: the backend sends a confirmation link and the
  // account stays unverified (no session cookie) until the user clicks it.
  return NextResponse.json({
    ok: true,
    message: result.data?.message || 'Account created. Check your email to confirm it.',
    emailSent: result.data?.emailSent === true,
  });
}
