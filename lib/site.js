// Публичный адрес сайта — единая точка для metadataBase, sitemap.xml и robots.txt.
// По умолчанию — прод; при необходимости переопределяется переменной
// NEXT_PUBLIC_SITE_URL (например, http://localhost:3000 для локальной проверки).
export const SITE_URL = (
  process.env.SITE_URL || 'https://gametips.bet'
).replace(/\/+$/, '');
