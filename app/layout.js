import './globals.css';
import GoogleAnalyticsProvider from '@/components/GoogleAnalyticsProvider';
import AuthProvider from '@/components/AuthContext';
import { SITE_URL } from '@/lib/site';

export const metadata = {
  title: "GameTips — Today's Football Predictions",
  description:
    "Fresh betting tips for today's matches from the GameTips analyst team.",
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: "GameTips — Today's Football Predictions",
    description:
      "Fresh betting tips for today's matches from the GameTips analyst team.",
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
      <body>
        {/* Общее состояние авторизации (user, AuthModal) для всех страниц. */}
        <AuthProvider>
          {children}
        </AuthProvider>
        {/* Google Analytics + баннер согласия на cookie.
            Рендерятся только если задан NEXT_PUBLIC_GA_ID. */}
        <GoogleAnalyticsProvider />
      </body>
    </html>
  );
}