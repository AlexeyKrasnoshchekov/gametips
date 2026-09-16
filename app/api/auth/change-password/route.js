import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import { callAuthBackend } from '@/lib/authApi';

export const runtime = 'nodejs';

// Смена пароля для вошедшего пользователя. Email берётся из подписанной
// gt_session-куки, а не из тела запроса: сменить пароль можно только у своей
// учётной записи, и для подтверждения обязателен текущий пароль (его сверяет
// бэкенд). Клиент присылает SHA-256 хэши (см. lib/password.js) — открытые
// пароли по сети не передаются.
export async function POST(req) {
  const store = await cookies();
  const session = verifySessionToken(store.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json(
      { error: 'Your session has expired. Please sign in again.' },
      { status: 401 },
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const currentHash =
    typeof body?.currentPasswordHash === 'string' && body.currentPasswordHash
      ? body.currentPasswordHash.trim().toLowerCase()
      : null;
  const newHash =
    typeof body?.newPasswordHash === 'string' && body.newPasswordHash
      ? body.newPasswordHash.trim().toLowerCase()
      : null;

  if (!currentHash || !newHash) {
    return NextResponse.json(
      { error: 'Current and new passwords are required.' },
      { status: 400 },
    );
  }

  const result = await callAuthBackend('/change-password', {
    email: session.email,
    currentPasswordHash: currentHash,
    newPasswordHash: newHash,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.data?.message || 'Could not change the password. Please try again.' },
      { status: result.status },
    );
  }

  return NextResponse.json({
    ok: true,
    message: result.data?.message || 'Password updated successfully.',
  });
}
