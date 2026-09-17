import { SITE_URL } from '@/lib/site';
import { getBlogPosts } from '@/lib/blog';

// Карта сайта для поисковиков — Next.js отдаёт её по адресу /sitemap.xml.
// Посты блога теперь живые: lib/blog.js объединяет статьи из SEObot API и
// статичный резерв lib/blogPosts.js (новый пост попадает сюда сам).
// revalidate — .xml обновляется не чаще раза в час.
export const revalidate = 3600;

export default async function sitemap() {
  const posts = await getBlogPosts();
  const lastModified = new Date();

  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/best-picks`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/cookies`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: post.date ? new Date(post.date) : lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    })),
  ];
}

