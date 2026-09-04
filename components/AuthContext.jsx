'use client';

// Общее состояние авторизации для всего сайта (хедер на любой странице,
// замки карточек на Home / Best Picks). Провайдер монтируется в app/layout.js,
// поэтому сессия восстанавливается одним запросом /api/auth/me на страницу.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AuthModal, { AUTH_ERROR_MESSAGES } from './AuthModal';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authNotice, setAuthNotice] = useState('');

  // Restore the session on load and surface ?authError= / ?verified= query
  // params: they come back from the Google OAuth callback and from the email
  // verification link (the backend redirects with them after checking tokens).
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.user) setUser(data.user);
      })
      .catch(() => {});

    const params = new URLSearchParams(window.location.search);

    const consumeParam = (name) => {
      const value = params.get(name);
      if (value !== null) params.delete(name);
      return value;
    };

    const authError = consumeParam('authError');
    const verified = consumeParam('verified');

    if (authError || verified !== null) {
      const qs = params.toString();
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${qs ? `?${qs}` : ''}`,
      );
      if (!cancelled) {
        const notice = authError
          ? AUTH_ERROR_MESSAGES[authError] || 'Sign-in failed. Please try again.'
          : verified === '1'
            ? 'Email confirmed! Please sign in with your credentials.'
            : 'The confirmation link is invalid or has expired. Please sign in and resend the confirmation email.';
        setAuthNotice(notice);
        setAuthOpen(true);
      }
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAuthenticated = useCallback((nextUser) => {
    setUser(nextUser);
    setAuthNotice('');
    setAuthOpen(false);
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  }, []);

  // Открыть модалку авторизации из любого места (хедер, замки карточек).
  const openAuth = useCallback(() => setAuthOpen(true), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        authOpen,
        setAuthOpen,
        authNotice,
        setAuthNotice,
        openAuth,
        handleSignOut,
      }}
    >
      {children}
      {/* Единственный на приложение AuthModal — рендерится на всех страницах,
          открывается через openAuth() / setAuthOpen(true) из контекста. */}
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        notice={authNotice}
        onAuthenticated={handleAuthenticated}
      />
    </AuthContext.Provider>
  );
}
