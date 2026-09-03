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

  // Только SHA-256 хэш пароля (новый клиент); открытый пароль в password —
  // легаси от закэшированных старых клиентов, на переходный период пробрасываем.
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
    '/resend-verification',
    passwordHash
      ? { email: String(body?.email || ''), passwordHash }
      : { email: String(body?.email || ''), password: legacyPassword },
  );

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