'use client';

import { useEffect, useState } from 'react';
import { hashPassword } from '@/lib/password';

export const AUTH_ERROR_MESSAGES = {
  google_not_configured:
    'Google sign-in is not configured yet: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the server.',
  invalid_state: 'The sign-in attempt expired or is invalid. Please try again.',
  google_token_error: 'Google did not accept the sign-in. Please try again.',
  google_unreachable: 'Could not reach Google. Check your connection and try again.',
  google_profile_error: 'Google did not return a usable profile. Please try another account.',
  google_backend_error: 'Could not sync the Google account with the auth service. Please try again.',
};

export default function AuthModal({ open, onClose, notice, onAuthenticated }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Email confirmation flow: after a successful sign-up we show a
  // "check your inbox" panel instead of signing the user in.
  const [registeredEmail, setRegisteredEmail] = useState(null);
  const [emailSent, setEmailSent] = useState(true);
  const [resendNote, setResendNote] = useState('');
  // Set when a login attempt hits 403 (account not verified yet) —
  // offers a "resend confirmation email" shortcut right in the form.
  const [needsVerification, setNeedsVerification] = useState(false);

  // Lock page scroll and close on Escape while the modal is open.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setError('');
      setBusy(false);
      setNeedsVerification(false);
      setResendNote('');
    } else {
      // Reset the "check your email" panel once the modal is closed.
      setRegisteredEmail(null);
      setResendNote('');
    }
  }, [open, mode]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setNeedsVerification(false);
    setResendNote('');
    setBusy(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      // SHA-256 пароля считается в браузере: на сервер уходит только хэш,
      // открытый пароль не передаётся по сети.
      const passwordHash = await hashPassword(password);
      const payload =
        mode === 'login'
          ? { email, passwordHash }
          : { email, passwordHash, name };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        // 403 = the account exists but the email is not confirmed yet —
        // offer a "resend confirmation email" shortcut right in the form.
        if (res.status === 403 && mode === 'login') setNeedsVerification(true);
        setError(data?.error || 'Something went wrong. Please try again.');
        return;
      }
      if (mode === 'register') {
        // The account was created but must be confirmed via the email link —
        // no session until the user verifies.
        setRegisteredEmail(email);
        setEmailSent(data?.emailSent === true);
        return;
      }
      onAuthenticated(data.user);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const resendConfirmation = async () => {
    if (busy) return;
    setError('');
    setResendNote('');
    setBusy(true);
    try {
      // Тот же принцип: только SHA-256 хэш пароля, открытый пароль не передаётся.
      const passwordHash = await hashPassword(password);
      const res = await fetch('/api/auth/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, passwordHash }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || 'Could not resend the email. Please try again.');
        return;
      }
      setEmailSent(data?.emailSent === true);
      setResendNote(data?.message || 'Confirmation email sent. Please check your inbox.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-modal-overlay">
      {/* Модалка закрывается только по крестику, Escape или успешному входу —
          клик/движение мыши вне окна больше её не закрывает */}
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-label={
          registeredEmail ? 'Check your email' : mode === 'login' ? 'Sign in' : 'Create account'
        }
      >
        <div className="ai-modal-head">
          <div className="ai-modal-title">
            <i className="fa-solid fa-user"></i>{' '}
            {registeredEmail
              ? 'Check your email'
              : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
          </div>
          <button className="ai-modal-close" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {notice && <p className="auth-notice">{notice}</p>}

        {registeredEmail ? (
          <div className="auth-form">
            <p className="auth-notice">
              <i className="fa-solid fa-envelope-circle-check"></i>{' '}
              We&apos;ve sent a confirmation link to <strong>{registeredEmail}</strong>. Open the
              email and click the button to activate your account.
            </p>
            <p className="auth-notice auth-notice-hint">
              <strong>Can&apos;t find the email?</strong>
              <br />
              Check your spam or junk folder. If it is there, select the email and mark it as
              &quot;Not Spam&quot; or &quot;Not Junk&quot; to make sure you get future updates.
            </p>
            {!emailSent && (
              <p className="auth-error">
                <i className="fa-solid fa-triangle-exclamation"></i> The email could not be sent
                right now. Please try resending it below.
              </p>
            )}
            {resendNote && (
              <p className="auth-notice">
                <i className="fa-solid fa-check"></i> {resendNote}
              </p>
            )}
            <button
              type="button"
              className="auth-submit"
              disabled={busy}
              onClick={resendConfirmation}
            >
              {busy && <i className="fa-solid fa-circle-notch fa-spin"></i>}
              Resend confirmation email
            </button>
            <button
              type="button"
              className="auth-submit"
              onClick={() => {
                setRegisteredEmail(null);
                setResendNote('');
                setMode('login');
              }}
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
        <a className="google-btn" href="/api/auth/google/start">
          <i className="fa-brands fa-google"></i> Continue with Google
        </a>

        <div className="auth-divider">
          <span>or with email</span>
        </div>

        <form className="auth-form" onSubmit={submit} netlify>
          {mode === 'register' && (
            <label className="auth-field">
              <span>Name</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                maxLength={60}
              />
            </label>
          )}
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              required
              minLength={mode === 'register' ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>

          {error && (
            <p className="auth-error">
              <i className="fa-solid fa-triangle-exclamation"></i> {error}
            </p>
          )}

          {needsVerification && mode === 'login' && (
            <button
              type="button"
              className="auth-submit"
              disabled={busy}
              onClick={resendConfirmation}
            >
              {busy && <i className="fa-solid fa-circle-notch fa-spin"></i>}
              Resend confirmation email
            </button>
          )}
          {resendNote && mode === 'login' && (
            <p className="auth-notice">
              <i className="fa-solid fa-check"></i> {resendNote}
            </p>
          )}

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy && <i className="fa-solid fa-circle-notch fa-spin"></i>}
            {mode === 'login' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? (
            <>
              No account yet?{' '}
              <button type="button" onClick={() => setMode('register')}>
                Create one
              </button>
            </>
          ) : (
            <>
              Already registered?{' '}
              <button type="button" onClick={() => setMode('login')}>
                Sign in
              </button>
            </>
          )}
        </p>
          </>
        )}
      </div>
    </div>
  );
}
