import { NextResponse } from 'next/server';
import { callAuthBackend } from '@/lib/authApi';

export const runtime = 'nodejs';

// Resends the confirmation email for an unverified account.
// The backend requires email + password so nobody can spam
// arbitrary addresses or probe which emails are registered.
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const result = await callAuthBackend('/resend-verification', {
    email: String(body?.email || ''),
    password: String(body?.password || ''),
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.data?.message || 'Could not resend the email. Please try again.' },
      { status: result.status },
    );
  }

  return NextResponse.json({
    ok: true,
    message: result.data?.message || 'Confirmation email sent.',
    emailSent: result.data?.emailSent === true,
  });
}