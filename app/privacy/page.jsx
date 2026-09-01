import './privacy.css';

export const metadata = {
  title: 'Cookie Policy — GameTips',
  description:
    'How GameTips uses cookies: analytics, consent and your choices.',
};

export default function PrivacyPage() {
  const cookies = [
    {
      name: 'gt_session',
      purpose: 'Session (authentication)',
      description:
        'Signed session token placed after sign in. Keeps you logged in and lets you unlock all predictions.',
      duration: '7 days',
      required: true,
    },
    {
      name: 'gt_oauth_state',
      purpose: 'Security (CSRF)',
      description:
        'Short-lived random value used during sign-in with Google to protect against cross-site request forgery. Cleared immediately after the flow.',
      duration: '10 minutes',
      required: true,
    },
    {
      name: 'gt_consent',
      purpose: 'Consent',
      description:
        'Remembers whether you accepted or declined analytics cookies, so the banner is not shown again.',
      duration: '1 year',
      required: true,
    },
    {
      name: '_ga, _gid, _ga_<ID>',
      purpose: 'Analytics',
      description:
        'Google Analytics cookies that help us understand how visitors use the site. Only set after you accept analytics cookies.',
      duration: 'up to 2 years',
      required: false,
    },
  ];

  return (
    <main className="privacy-page">
      <h1>Cookie Policy</h1>
      <p>
        This page explains which cookies GameTips uses and how you can control
        them. By continuing to use the site you agree to the use of strictly
        necessary cookies; analytics cookies are only used after you give your
        consent.
      </p>

      <h2>What is a cookie?</h2>
      <p>
        A cookie is a small text file stored in your browser. It helps a
        website remember information about your visit, such as your login
        session or your preferences.
      </p>

      <h2>Strictly necessary cookies</h2>
      <p>
        These are required for the site to function and are set without asking
        your consent. They cannot be disabled.
      </p>

      <h2>Analytics cookies</h2>
      <p>
        We use Google Analytics to understand how visitors use GameTips. These
        cookies are only set after you click &ldquo;Accept&rdquo; in the
        consent banner. If you decline, Google Analytics runs in a
        privacy-safe mode and no analytics cookies are set.
      </p>

      <h2>Cookies we use</h2>
      <div className="privacy-table-wrap">
        <table className="privacy-table">
          <thead>
            <tr>
              <th>Cookie</th>
              <th>Purpose</th>
              <th>Duration</th>
              <th>Required</th>
            </tr>
          </thead>
          <tbody>
            {cookies.map((c) => (
              <tr key={c.name}>
                <td>
                  <code>{c.name}</code>
                </td>
                <td>{c.description}</td>
                <td>{c.duration}</td>
                <td>{c.required ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>How to control cookies</h2>
      <p>
        You can change your choice at any time by clearing your browser&apos;s
        cookies — the consent banner will then appear again. You can also
        disable or delete cookies in your browser settings, or opt out of
        Google Analytics by installing the{' '}
        <a
          href="https://tools.google.com/dlpage/gaoptout"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google Analytics Opt-out Browser Add-on
        </a>
        .
      </p>

      <p>
        If you have any questions about this policy, please contact us.
      </p>
    </main>
  );
}