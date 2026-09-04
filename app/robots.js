import { SITE_URL } from '@/lib/site';

// robots.txt для поисковиков. Указываем адрес sitemap.xml, чтобы краулеры
// находили карту сайта автоматически (проверить: /robots.txt).
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Служебные маршруты авторизации в индекс не нужны.
        disallow: ['/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
