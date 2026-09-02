import '../privacy/privacy.css';

export const metadata = {
  title: 'Terms of Service — GameTips',
  description:
    'The terms and conditions that apply when you use gametips.bet and its football predictions.',
};

export default function TermsPage() {
  return (
    <main className="privacy-page">
      <h1>Terms of Service</h1>
      <p className="legal-updated">Last updated: September 2, 2026</p>

      <p>
        Welcome to GameTips. These Terms of Service (&ldquo;Terms&rdquo;)
        govern your access to and use of gametips.bet and related services
        (the &ldquo;Service&rdquo;). By using the Service you agree to these
        Terms. If you do not agree, please do not use the Service.
      </p>

      <h2>1. What GameTips provides</h2>
      <p>
        GameTips publishes football predictions and statistics (such as
        match-winner, over/under, both teams to score and correct score
        insights) for informational purposes. Some predictions are available
        to everyone; signing in with a free account unlocks all content.
      </p>

      <h2>2. Accounts and eligibility</h2>
      <ul>
        <li>
          You must be at least 18 years old to create an account. The Service
          covers betting-related information and is not intended for minors.
        </li>
        <li>
          You agree to provide accurate registration information and to keep
          your password confidential. You are responsible for activity that
          happens under your account.
        </li>
        <li>
          If you sign in with Google, your use of Google is also governed by
          Google&rsquo;s own terms and privacy policy.
        </li>
        <li>
          We may suspend or remove accounts that violate these Terms or that
          we reasonably believe are used for abuse or fraud.
        </li>
      </ul>

      <h2>3. Acceptable use</h2>
      <ul>
        <li>Do not scrape, harvest or copy the content systematically;</li>
        <li>Do not resell, republish or redistribute our predictions;</li>
        <li>Do not use automated tools to access the Service without permission;</li>
        <li>Do not interfere with the operation or security of the Service;</li>
        <li>Do not use the Service for any unlawful purpose.</li>
      </ul>

      <h2>4. No guarantee — informational only</h2>
      <p>
        All predictions and statistics on GameTips are opinions based on
        historical data and models. They are <strong>not</strong> betting or
        financial advice and we do not guarantee that any prediction is
        correct or that any strategy will be profitable. Betting involves
        risk. All betting decisions — and their outcomes — are entirely your
        responsibility.
      </p>

      <h2>5. Responsible gambling</h2>
      <p>
        If you choose to bet, do so responsibly and only with money you can
        afford to lose. Never chase losses. If gambling stops being fun or
        you feel it is becoming a problem, seek help — for example at{' '}
        <a
          href="https://www.begambleaware.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          BeGambleAware
        </a>{' '}
        or{' '}
        <a
          href="https://www.gamblingtherapy.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Gambling Therapy
        </a>
        .
      </p>

      <h2>6. Intellectual property</h2>
      <p>
        The Service, including its design, texts, predictions and data
        compilations, is owned by the operator of GameTips or its licensors.
        You may use the Service for personal, non-commercial purposes only.
      </p>

      <h2>7. Disclaimer and limitation of liability</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as
        available&rdquo; without warranties of any kind, express or implied.
        To the maximum extent permitted by law, the operator of GameTips is
        not liable for any losses (including lost bets, profits or data)
        arising from your use of, or reliance on, the Service or its
        content.
      </p>

      <h2>8. Suspension and termination</h2>
      <p>
        We may modify, suspend or discontinue any part of the Service at any
        time. You may stop using the Service at any time. We may also suspend
        or terminate your account if you breach these Terms.
      </p>

      <h2>9. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. The current version is
        always published on this page with an updated &ldquo;Last
        updated&rdquo; date. Continued use of the Service after changes take
        effect means you accept the updated Terms.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These Terms are governed by the laws of the country in which the
        operator of GameTips is established, without regard to
        conflict-of-law rules. Mandatory consumer rights in your country of
        residence remain unaffected.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about these Terms? Contact us at{' '}
        <a href="mailto:support@gametips.bet">support@gametips.bet</a>.
      </p>

      <nav className="legal-nav" aria-label="Legal pages">
        <a href="/privacy">Privacy Policy</a>
        <a href="/cookies">Cookie Policy</a>
        <a href="/">Back to GameTips</a>
      </nav>
    </main>
  );
}