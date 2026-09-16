'use client';

// Модалка смены пароля для вошедшего пользователя. Открывается из хедера
// (иконка-ключ рядом с Sign out) через AuthContext.openChangePassword().
// Оформление и поведение — как у AuthModal: те же CSS-классы, блокировка
// скролла страницы, закрытие по Escape и крестику.
// Пароли хэшируются в браузере (SHA-256, lib/password.js) — по сети уходят
// только хэши, открытые пароли не передаются.
import { useEffect, useState } from 'react';
import { hashPassword } from '@/lib/password';

export default function ChangePasswordModal({ open, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Успешная смена: показываем панель «пароль обновлён» вместо формы
  const [done, setDone] = useState(false);

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

  // Reset the form each time the modal opens.
  useEffect(() => {
    if (open) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setBusy(false);
      setDone(false);
    }
  }, [open]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError('');

    // Клиентская валидация — как в форме регистрации (minLength 8).
    if (newPassword.length < 8) {
      setError('The new password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('The new password must be different from the current one.');
      return;
    }

    setBusy(true);
    try {
      // SHA-256 паролей считается в браузере: на сервер уходят только хэши.
      const [currentPasswordHash, newPasswordHash] = await Promise.all([
        hashPassword(currentPassword),
        hashPassword(newPassword),
      ]);
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPasswordHash, newPasswordHash }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || 'Could not change the password. Please try again.');
        return;
      }
      setDone(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal" role="dialog" aria-modal="true" aria-label="Change password">
        <div className="ai-modal-head">
          <div className="ai-modal-title">
            <i className="fa-solid fa-key"></i> Change password
          </div>
          <button className="ai-modal-close" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {done ? (
          <div className="auth-form">
            <p className="auth-notice">
              <i className="fa-solid fa-check"></i> Your password has been updated. Use the new
              password next time you sign in.
            </p>
            <button type="button" className="auth-submit" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <label className="auth-field">
              <span>Current password</span>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Your current password"
                autoComplete="current-password"
              />
            </label>
            <label className="auth-field">
              <span>New password</span>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </label>
            <label className="auth-field">
              <span>Confirm new password</span>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat the new password"
                autoComplete="new-password"
              />
            </label>

            {error && (
              <p className="auth-error">
                <i className="fa-solid fa-triangle-exclamation"></i> {error}
              </p>
            )}

            <button type="submit" className="auth-submit" disabled={busy}>
              {busy && <i className="fa-solid fa-circle-notch fa-spin"></i>}
              Update password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
