// lib/seobot.mjs — живая интеграция с SEObot API (настройки перенесены из
// примера seobot-nextjs-blog).
//
// Как это работает:
//   - пакет seobot (BlogClient) из package.json тянет статьи с CDN SEObot
//     (cdn.seobotai.com) по ключу SEOBOT_API_KEY из .env.local;
//   - статьи нормализуются к формату постов lib/blogPosts.js, поэтому /blog,
//     /blog/<slug>, sitemap.xml и llms.txt работают через единый слой lib/blog.js;
//   - очистка HTML (extractJsonLd, cleanHtml и т.д.) — общий пайплайн, его же
//     использует scripts/add-post.mjs для статичного снимка lib/blogPosts.js.
//
// Файл сделан .mjs, чтобы работать и под Next.js, и напрямую из node.
// Модуль серверный: импортируйте только из Server Components и route handlers —
// SEOBOT_API_KEY никогда не должен попадать в клиентский бандл.
import { BlogClient } from 'seobot';

const POSTS_TTL_MS = 10 * 60 * 1000;   // живой список статей обновляется раз в 10 минут
const POST_TTL_MS = 10 * 60 * 1000;    // кэш отдельной статьи
const FAILURE_COOLDOWN_MS = 60 * 1000; // после сбоя API следующая попытка через минуту
const PAGE_LIMIT = 100;                // сколько индексных записей запрашивать за раз
const MAX_ARTICLES = 300;              // защита от аномально большой выгрузки

// ---------- Очистка HTML от служебных элементов SEObot ----------

export function extractJsonLd(html) {
  const re = /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let schema = null;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      schema = JSON.parse(m[1].trim());
    } catch {
      // невалидный JSON-LD просто игнорируем
    }
  }
  return schema;
}

export function cleanHtml(html) {
  const warnings = [];
  let out = html;

  // 1. <script>-теги (внешний баннер seobotai). JSON-LD уже извлечён отдельно.
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

  // 2. Скрытые служебные заголовки-баннеры (sbb-itb-...).
  out = out.replace(/<h6\b[^>]*class="[^"]*sb-banner[^"]*"[^>]*>[\s\S]*?<\/h6>/gi, '');

  // 3. <figure> с битой картинкой: SEObot подставляет /undefined/, когда картинка не задана.
  out = out.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, (fig) => {
    const src = fig.match(/<img\b[^>]*\ssrc="([^"]*)"/i);
    if (src && /\/undefined\//.test(src[1])) {
      warnings.push(`удалён <figure> с битой картинкой: ${src[1]}`);
      return '';
    }
    return fig;
  });

  // 4. Служебные классы/атрибуты SEObot.
  out = out.replace(/[ \t]*class="sb h2-sbb-cls"/g, '');
  out = out.replace(/[ \t]*tabindex="-1"/g, '');

  // 5. Первый <h1> вырезаем: страница статьи уже рендерит <h1> из заголовка.
  out = out.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i, '');

  out = out.replace(/\n{3,}/g, '\n\n').trim();
  return { html: out, warnings };
}

// ---------- Вспомогательные преобразования ----------

export function computeReadTime(html) {
  const words = (html.replace(/<[^>]+>/g, ' ').match(/\S+/g) || []).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

export function toDateParts(dateStr) {
  const d = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();
  if (Number.isNaN(d.getTime())) throw new Error(`Некорректная дата: ${dateStr}`);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
  return { date: `${y}-${m}-${day}`, dateLabel };
}

export const isUsableImage = (src) =>
  Boolean(src) && /^https?:\/\//.test(src) && !/\/undefined\//.test(src);

// ---------- Нормализация статьи SEObot к формату lib/blogPosts.js ----------

// Возвращает пост в едином формате или null (не опубликована/удалена/пустая).
// onWarning — колбэк для предупреждений очистки (скрипт синка логирует их).
export function normalizeSeobotArticle(article, { onWarning } = {}) {
  if (!article || article.deleted || article.published === false) return null;
  const rawHtml = article.html || '';
  if (!rawHtml.trim()) return null;
  const { html, warnings } = cleanHtml(rawHtml);
  if (!html) return null;
  for (const w of warnings) onWarning?.(w);
  const { date, dateLabel } = toDateParts(
    (article.publishedAt || article.createdAt || '').slice(0, 10)
  );
  return {
    slug: article.slug,
    title: article.title || article.headline,
    description: article.metaDescription || article.headline || '',
    keywords: (article.metaKeywords || '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean),
    image: isUsableImage(article.image) ? article.image : '',
    date,
    dateLabel,
    readTime: article.readingTime
      ? `${article.readingTime} min read`
      : computeReadTime(html),
    faqSchema: extractJsonLd(rawHtml),
    html,
    relatedPosts: (article.relatedPosts || [])
      .map((p) => ({ slug: p?.slug, headline: p?.headline || '' }))
      .filter((p) => p.slug),
    source: 'seobot',
  };
}

// ---------- Клиент SEObot и кэши ----------

let _client = null;

function getClient() {
  if (_client) return _client;
  const key = process.env.SEOBOT_API_KEY;
  if (!key) return null;
  _client = new BlogClient(key);
  return _client;
}

async function fetchAllLivePosts(client) {
  // 1. Индекс статей (лёгкие записи: slug, title, описание, дата...).
  const index = [];
  let total = Infinity;
  for (let page = 0; index.length < total && index.length < MAX_ARTICLES; page += 1) {
    const { articles, total: t } = await client.getArticles(page, PAGE_LIMIT);
    total = typeof t === 'number' ? t : index.length + articles.length;
    if (!articles || articles.length === 0) break;
    index.push(...articles);
  }
  if (index.length === 0) return [];
  // 2. Полные статьи параллельно — фильтруем черновики и удалённые.
  const full = await Promise.all(
    index.map((short) =>
      client
        .getArticle(short.slug)
        .then((a) => normalizeSeobotArticle(a))
        .catch((err) => {
          console.warn(`[seobot] статья ${short.slug} пропущена: ${err?.message || err}`);
          return null;
        })
    )
  );
  return full.filter(Boolean);
}

// Кэш списка: живой список обновляется раз в POSTS_TTL_MS; после сбоя повторная
// попытка не чаще раза в FAILURE_COOLDOWN_MS, а сайт всё это время работает на
// статичном резерве (см. lib/blog.js).
const postsCache = { value: null, goodUntil: 0, retryAfter: 0, inflight: null };

// Живые статьи SEObot. null — live-часть недоступна (нет ключа либо ошибка API
// и нет кэша); [] — ключ есть, но в SEObot пока нет ни одной статьи.
export async function getLivePosts() {
  const client = getClient();
  if (!client) return null;
  const now = Date.now();
  if (postsCache.inflight) return postsCache.inflight;
  if (postsCache.value && now < postsCache.goodUntil) return postsCache.value;
  if (now < postsCache.retryAfter) return postsCache.value;
  postsCache.inflight = (async () => {
    try {
      postsCache.value = await fetchAllLivePosts(client);
      postsCache.goodUntil = Date.now() + POSTS_TTL_MS;
    } catch (err) {
      console.warn('[seobot] не удалось получить статьи из API:', err?.message || err);
      postsCache.retryAfter = Date.now() + FAILURE_COOLDOWN_MS;
    } finally {
      postsCache.inflight = null;
    }
    return postsCache.value;
  })();
  return postsCache.inflight;
}

// Кэш отдельных статей (страница /blog/<slug>).
const postCache = new Map(); // slug -> { value: пост|null, goodUntil }

// Живая статья по slug или null (нет в SEObot / не опубликована / ошибка).
export async function getLivePost(slug) {
  const client = getClient();
  if (!client) return null;
  const now = Date.now();
  const hit = postCache.get(slug);
  if (hit && now < hit.goodUntil) return hit.value;
  try {
    const normalized = normalizeSeobotArticle(await client.getArticle(slug));
    postCache.set(slug, { value: normalized, goodUntil: now + POST_TTL_MS });
    return normalized;
  } catch (err) {
    console.warn(`[seobot] статья ${slug} не получена: ${err?.message || err}`);
    return hit ? hit.value : null;
  }
}
