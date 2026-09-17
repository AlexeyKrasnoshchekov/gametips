import '../privacy/privacy.css';
import './blog.css';
import { getBlogPosts } from '@/lib/blog';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

// Список постов живой: lib/blog.js объединяет статьи из SEObot API и статичный
// резерв lib/blogPosts.js. Пагинация как в примере seobot-nextjs-blog (?page=N).
const POSTS_PER_PAGE = 10;

export const metadata = {
  title: 'Blog — GameTips',
  description:
    'Practical guides on football betting markets: odds and implied probability, Over/Under goals, BTTS and how to read aggregated predictions.',
  alternates: { canonical: '/blog' },
};

export default async function BlogPage({ searchParams }) {
  const params = await searchParams;
  const allPosts = await getBlogPosts();

  // ?page=N — номер страницы с 1 (как в примере: apiPage = urlPage - 1).
  const totalPages = Math.max(1, Math.ceil(allPosts.length / POSTS_PER_PAGE));
  const page = Math.min(Math.max(Number.parseInt(params?.page, 10) || 1, 1), totalPages);
  const posts = allPosts.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);

  return (
    <>
      <SiteHeader />
      <main className="privacy-page blog-page">
        <h1>Blog</h1>
        <p className="legal-updated">
          Practical guides to football betting tips and markets — written to help
          you read our football predictions boards like an analyst.
        </p>

        <div className="blog-list">
          {posts.map((post) => (
            <a key={post.slug} className="blog-card" href={`/blog/${post.slug}`}>
              <span className="blog-card-meta">
                {post.dateLabel} · {post.readTime}
              </span>
              <h2>{post.title}</h2>
              <p>{post.description}</p>
              <span className="read-more">
                Read article <i className="fa-solid fa-arrow-right"></i>
              </span>
            </a>
          ))}
        </div>

        {totalPages > 1 && (
          <nav className="blog-pagination" aria-label="Blog pages">
            {page > 1 && <a href={`/blog?page=${page - 1}`}>&larr; Newer</a>}
            <span>
              Page {page} of {totalPages}
            </span>
            {page < totalPages && <a href={`/blog?page=${page + 1}`}>Older &rarr;</a>}
          </nav>
        )}

        <nav className="legal-nav" aria-label="Site pages">
          <a href="/">Today&rsquo;s Predictions</a>
          <a href="/best-picks">Best Picks</a>
          <a href="/about">About</a>
        </nav>
      </main>
      <SiteFooter />
    </>
  );
}

