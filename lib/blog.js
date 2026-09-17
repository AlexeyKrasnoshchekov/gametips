// lib/blog.js — единый слой данных блога. Используется /blog, /blog/<slug>,
// sitemap.xml и llms.txt (настройки перенесены из примера seobot-nextjs-blog).
//
// Источники постов:
//   1. Живые статьи SEObot (lib/seobot.mjs) — появляются на сайте автоматически,
//      без пересборки (кэш обновляется раз в 10 минут);
//   2. Статичные посты lib/blogPosts.js — снимок/резерв: если API недоступен,
//      блог продолжает работать на нём. Обновить снимок: npm run blog:sync.
//
// При слиянии живая версия поста с тем же slug заменяет статичную (она свежее).
import { blogPosts, getPostBySlug as getStaticPostBySlug } from './blogPosts';
import { getLivePosts, getLivePost } from './seobot.mjs';

// Все посты блога (живые + статичные, которых нет в SEObot), новые сверху.
export async function getBlogPosts() {
  const live = await getLivePosts();
  const livePosts = Array.isArray(live) ? live : [];
  const liveSlugs = new Set(livePosts.map((post) => post.slug));
  return [...livePosts, ...blogPosts.filter((post) => !liveSlugs.has(post.slug))].sort(
    (a, b) => (a.date < b.date ? 1 : -1)
  );
}

// Пост по slug: сначала живая версия из SEObot, затем статичный резерв.
export async function getBlogPost(slug) {
  return (await getLivePost(slug)) || getStaticPostBySlug(slug);
}
