'use client';

import { useEffect, useState } from 'react';

const CONSENT_COOKIE = 'gt_consent';
const TTL_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

// Returns true when the user has previously made a choice about analytics
// cookies ("accepted" or "declined"); false if we don't know yet.
function readConsent() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${CONSENT_COOKIE}=`));
  if (!match) return null;
  return match.split('=')[1] === 'accepted';
}

function writeConsent(value) {
  const expires = new Date(Date.now() + TTL_MS).toUTCString();
  document.cookie = `${CONSENT_COOKIE}=${value ? 'accepted' : 'declined'}; path=/; max-age=${TTL_MS / 1000}; SameSite=Lax; expires=${expires}`;
}

// Pushes the storage consent to Google (Consent Mode v2). Safe to call before
// the gtag library has loaded — commands are buffered in window.dataLayer.
function applyConsent(consent) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'consent_update',
    consent: {
      analytics_storage: consent ? 'granted' : 'denied',
    },
  });
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: consent ? 'granted' : 'denied',
    });
  }
}

export default function CookieConsent() {
  // Null while unknown — the banner stays hidden until we read the cookie.
  const [consent, setConsent] = useState(null);

  useEffect(() => {
    const stored = readConsent();
    // Apply the stored choice immediately so Analytics respects it on load.
    if (stored !== null) applyConsent(stored);
    setConsent(stored);
  }, []);

  // The banner is rendered by the server only when Analytics is configured
  // (see GoogleAnalyticsProvider). If a render slips through without GA,
  // keep it hidden to avoid bothering visitors for no reason.
  if (consent !== null) return null;

  const choose = (value) => {
    writeConsent(value);
    applyConsent(value);
    setConsent(value); // hides the banner
  };

  return (
    <div className="cookie-consent" role="region" aria-label="Cookie consent">
      <div className="cookie-consent-text">
        <i className="fa-solid fa-cookie-bite"></i>{' '}
        We use cookies to improve and analyse your experience. Learn more in
        our{' '}
        <a href="/privacy" className="cookie-consent-link">
          cookie policy
        </a>
        .
      </div>
      <div className="cookie-consent-actions">
        <button
          type="button"
          className="cookie-consent-btn"
          onClick={() => choose(false)}
        >
          Decline
        </button>
        <button
          type="button"
          className="cookie-consent-btn primary"
          onClick={() => choose(true)}
        >
          Accept
        </button>
      </div>
    </div>
  );
}