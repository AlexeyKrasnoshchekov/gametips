import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, findUserByEmail, publicUser, verifySessionToken } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  const store = await cookies();
  const session = verifySessionToken(store.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ user: null });

  // Google-linked profiles live in the local store — return fresh data (the
  // profile may have been updated by a later Google link).
  const localUser = findUserByEmail(session.email);
  if (localUser) return NextResponse.json({ user: publicUser(localUser) });

  // Email/password users live in MongoDB (gametips-server) — rebuild the
  // profile from the signed session payload.
  return NextResponse.json({
    user: {
      id: session.uid,
      email: session.email,
      name: session.name,
      provider: 'email',
    },
  });
}
