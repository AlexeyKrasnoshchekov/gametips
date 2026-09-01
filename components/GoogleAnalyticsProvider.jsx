// Server component: renders the Google Analytics snippet (and the cookie
// consent banner) only when NEXT_PUBLIC_GA_ID is configured. Skips the
// consent banner otherwise, so anonymous visitors of a site without GA are
// never asked about cookies.
import { GoogleAnalytics } from '@next/third-parties/google';
import CookieConsent from './CookieConsent';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function GoogleAnalyticsProvider() {
  if (!GA_ID) return null;

  return (
    <>
      <GoogleAnalytics gaId={GA_ID} />
      <CookieConsent />
    </>
  );
}