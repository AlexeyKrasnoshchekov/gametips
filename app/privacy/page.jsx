import './privacy.css';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export const metadata = {
  title: 'Privacy Policy — GameTips',
  description:
    'How GameTips collects, uses and protects your personal data when you use gametips.bet.',
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
    <main className="privacy-page">
      <h1>Privacy Policy</h1>
      <p className="legal-updated">Last updated: September 2, 2026</p>

      <p>
        This Privacy Policy explains what personal data GameTips
        (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects when you visit
        gametips.bet (&ldquo;the site&rdquo;) or create an account, how that
        data is used and protected, and what choices you have.
      </p>

      <h2>1. Information we collect</h2>

      <h3>Account information</h3>
      <p>
        When you register with an email address we collect your name (or
        username), email address and a password. We never store your password
        in plain text — only a cryptographic hash.
      </p>

      <h3>Google sign-in information</h3>
      <p>
        If you use &ldquo;Continue with Google&rdquo;, we receive your Google
        account name, email address and a Google account identifier. We do not
        receive your Google password.
      </p>

      <h3>Email verification data</h3>
      <p>
        When you register we generate a one-time email confirmation token
        (valid for 24 hours) so we can verify that the email address belongs
        to you.
      </p>

      <h3>Session information</h3>
      <p>
        After you sign in we place a signed session cookie in your browser to
        keep you logged in. See the <a href="/cookies">Cookie Policy</a> for
        the full list of cookies we use.
      </p>

      <h3>Analytics information</h3>
      <p>
        With your consent we use Google Analytics to understand how visitors
        use the site (pages visited, approximate location, device and browser
        type). If you decline, analytics cookies are not set.
      </p>

      <h3>Technical logs</h3>
      <p>
        Our hosting and API providers may automatically record technical data
        such as IP address, request time and status for security and
        troubleshooting purposes.
      </p>

      <h2>2. How we use your information</h2>
      <ul>
        <li>To create your account and authenticate you;</li>
        <li>To send email verification messages;</li>
        <li>To keep you signed in;</li>
        <li>To provide football predictions and statistics;</li>
        <li>To detect abuse, fraud and unauthorised access;</li>
        <li>To measure and improve the site (only with your consent for analytics).</li>
      </ul>
      <p>
        We do not sell your personal data and we do not use it for third-party
        advertising.
      </p>

      <h2>3. Legal bases</h2>
      <p>
        Where the GDPR applies, we process your data to perform our contract
        with you (account, authentication, providing the service), on the
        basis of legitimate interests (site security, abuse prevention) and,
        for analytics cookies, with your consent, which you can withdraw at
        any time via the cookie banner.
      </p>

      <h2>4. Third-party services</h2>
      <ul>
        <li>
          <strong>Google</strong> — OAuth sign-in and Google Analytics (only
          after consent);
        </li>
        <li>
          <strong>Resend</strong> — delivery of transactional emails such as
          the confirmation message;
        </li>
        <li>
          <strong>MongoDB Atlas</strong> — database hosting for account data;
        </li>
        <li>
          <strong>Netlify</strong> — hosting of the website and API routes;
        </li>
        <li>
          <strong>VPS provider</strong> — hosting of our application backend.
        </li>
      </ul>
      <p>
        These providers process data on our behalf under their own privacy
        and security terms.
      </p>

      <h2>5. Data retention</h2>
      <p>
        Account data is kept while your account exists. Email verification
        tokens expire after 24 hours. Session cookies expire after 7 days.
        Analytics data is retained according to the Google Analytics settings.
        You can request deletion of your account and personal data at any time
        (see below).
      </p>

      <h2>6. Your rights</h2>
      <p>
        Depending on your jurisdiction, you may have the right to access,
        correct or delete your personal data, to object to or restrict
        processing, to withdraw consent and to receive a copy of your data.
        To exercise any of these rights, contact us at the address below and
        we will respond within a reasonable time.
      </p>

      <h2>7. Data security</h2>
      <p>
        We use HTTPS for all traffic, store passwords only as bcrypt hashes
        and sign session cookies to prevent tampering. No method of
        transmission or storage is 100% secure, but we work hard to protect
        your data.
      </p>

      <h2>8. International transfers</h2>
      <p>
        Our providers may process data in countries other than yours. Where
        required, transfers rely on appropriate safeguards such as the EU
        Standard Contractual Clauses offered by our providers.
      </p>

      <h2>9. Children</h2>
      <p>
        GameTips is intended for users aged 18 and over and covers
        betting-related information. We do not knowingly collect personal
        data from anyone under 18. If you believe a minor has provided us
        with personal data, please contact us and we will delete it.
      </p>

      <h2>10. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Changes are
        published on this page with an updated &ldquo;Last updated&rdquo;
        date.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about this policy or your data? Contact us at{' '}
        <a href="mailto:support@gametips.bet">support@gametips.bet</a>.
      </p>

      <nav className="legal-nav" aria-label="Legal pages">
        <a href="/terms">Terms of Service</a>
        <a href="/cookies">Cookie Policy</a>
        <a href="/">Back to GameTips</a>
      </nav>
    </main>
      <SiteFooter />
    </>
  );
}