import './globals.css';
import GoogleAnalyticsProvider from '@/components/GoogleAnalyticsProvider';

export const metadata = {
  title: "FootTips — Today's Football Predictions",
  description:
    "Fresh betting tips for today's matches from the FootTips analyst team.",
  metadataBase: new URL('https://gametips.bet'),
  openGraph: {
    title: "FootTips — Today's Football Predictions",
    description:
      "Fresh betting tips for today's matches from the FootTips analyst team.",
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css"
        precedence="default"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap"
        rel="stylesheet"
        precedence="default"
      />
      <body>{children}</body>
      {/* Google Analytics + баннер согласия на cookie.
          Рендерятся только если задан NEXT_PUBLIC_GA_ID. */}
      <GoogleAnalyticsProvider />
    </html>
  );
}