import { notFound } from 'next/navigation';
import { getBlogPost } from '@/lib/blog';
import { blogPosts } from '@/lib/blogPosts';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import '../../privacy/privacy.css';
import '../blog.css';

// Статичные посты известны на момент сборки — пререндерим их; живые статьи
// SEObot рендерятся по запросу (dynamicParams включён по умолчанию) и кэшируются.
export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

// Живая статья перечитывается не чаще раза в 10 минут — совпадает с TTL кэша
// в lib/seobot.mjs.
export const revalidate = 600;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: 'Article not found — GameTips' };
  const metadata = {
    title: `${post.title} — GameTips`,
    description: post.description,
    alternates: { canonical: `/blog/${slug}` },
  };
  // Дополнительные SEO-поля приходят из статичных постов и статей SEObot.
  if (post.keywords?.length) metadata.keywords = post.keywords;
  metadata.openGraph = {
    title: post.title,
    description: post.description,
    type: 'article',
    url: `/blog/${slug}`,
  };
  if (post.image) metadata.openGraph.images = [post.image];
  return metadata;
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  return (
    <>
      <SiteHeader />
      <main className="privacy-page blog-article">
        {/* Главное изображение живой статьи из SEObot. */}
        {post.image ? (
          <img className="blog-hero" src={post.image} alt={post.title} />
        ) : null}

        <h1>{post.title}</h1>
        <p className="legal-updated">
          {post.dateLabel} · {post.readTime}
        </p>

        {/* Живая статья из SEObot — готовый HTML после очистки (lib/seobot.mjs). */}
        {post.html ? (
          <div
            className="blog-html"
            dangerouslySetInnerHTML={{ __html: post.html }}
          />
        ) : (
          (post.content || []).map((block, index) => {
            // Сырой HTML-блок — так скрипт scripts/add-post.mjs сохраняет статьи
            // из SEObot со всеми таблицами, figure и iframe.
            if (block.type === 'html') {
              return (
                <div
                  key={index}
                  className="blog-html"
                  dangerouslySetInnerHTML={{ __html: block.html }}
                />
              );
            }
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
          })
        )}

        {/* FAQPage JSON-LD (извлекается из статей SEObot) — для расширенных сниппетов. */}
        {post.faqSchema ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(post.faqSchema) }}
          />
        ) : null}

        {/* Related posts живой статьи из SEObot. */}
        {post.relatedPosts?.length ? (
          <section className="blog-related">
            <h2>Related posts</h2>
            <ul>
              {post.relatedPosts.map((rel) => (
                <li key={rel.slug}>
                  <a href={`/blog/${rel.slug}`}>{rel.headline || rel.slug}</a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

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

