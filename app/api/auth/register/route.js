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

  // Клиент присылает passwordHash = SHA-256(password) (считается в браузере).
  // Бэкенд (gametips-server) owns validation, bcrypt hashing и MongoDB user
  // store. Старые закэшированные клиенты ещё присылают открытый пароль в
  // password — на переходный период пробрасываем его как есть.
  const passwordHash =
    typeof body?.passwordHash === 'string' && body.passwordHash
      ? body.passwordHash.trim().toLowerCase()
      : null;
  const legacyPassword =
    typeof body?.password === 'string' && body.password ? body.password : null;

  if (!passwordHash && !legacyPassword) {
    return NextResponse.json({ error: 'Name, email and password are required.' }, { status: 400 });
  }

  const credentials = passwordHash ? { passwordHash } : { password: legacyPassword };

  const result = await callAuthBackend('/register', {
    name: String(body?.name || ''),
    email: String(body?.email || ''),
    ...credentials,
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
