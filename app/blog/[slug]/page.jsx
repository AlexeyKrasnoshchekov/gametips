import { notFound } from 'next/navigation';
import { blogPosts, getPostBySlug } from '@/lib/blogPosts';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import '../../privacy/privacy.css';
import '../blog.css';

// Слаги известны на момент сборки — пререндерим все статьи статически.
export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: 'Article not found — GameTips' };
  return {
    title: `${post.title} — GameTips`,
    description: post.description,
  };
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <>
      <SiteHeader />
    <main className="privacy-page blog-article">
      <h1>{post.title}</h1>
      <p className="legal-updated">
        {post.dateLabel} · {post.readTime}
      </p>

      {post.content.map((block, index) => {
        if (block.type === 'h2') {
          return <h2 key={index}>{block.text}</h2>;
        }
        if (block.type === 'ul') {
          return (
            <ul key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ul>
          );
        }
        return <p key={index}>{block.text}</p>;
      })}

      <nav className="legal-nav" aria-label="Site pages">
        <a href="/blog">Back to Blog</a>
        <a href="/best-picks">Best Picks</a>
        <a href="/">Today&rsquo;s Predictions</a>
      </nav>
    </main>
      <SiteFooter />
    </>
  );
}
