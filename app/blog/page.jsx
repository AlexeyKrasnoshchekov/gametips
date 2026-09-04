import '../privacy/privacy.css';
import './blog.css';
import { blogPosts } from '@/lib/blogPosts';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export const metadata = {
  title: 'Blog — GameTips',
  description:
    'Practical guides on football betting markets: odds and implied probability, Over/Under goals, BTTS and how to read aggregated predictions.',
};

export default function BlogPage() {
  const posts = [...blogPosts].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <>
      <SiteHeader />
    <main className="privacy-page blog-page">
      <h1>Blog</h1>
      <p className="legal-updated">
        Practical guides to football betting markets — written to help you read
        our predictions boards like an analyst.
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
