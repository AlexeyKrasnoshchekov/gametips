#!/usr/bin/env node
// scripts/add-post.mjs — автодобавление статей в массив blogPosts (lib/blogPosts.js).
//
// Источник — выгрузка статьи из SEObot (app.seobotai.com), сохранённая в .txt:
//
//   Image: https://...                 (необязательно)
//   Slug: football-tip-signs-worth-trusting
//   Page Title: Football Tip: 5 Signs to Trust
//   Meta Description: ...
//   Meta Keywords: a,b,c
//   Main text:
//   <h1>…</h1><p>…</p>
//
// Режимы работы:
//   node scripts/add-post.mjs scripts/posts/<файл>.txt     — добавить/обновить пост из файла
//   node scripts/add-post.mjs --date=2026-09-16 <файл>.txt — с явной датой публикации
//   npm run blog:sync                                      — забрать ВСЕ статьи из SEObot API
//                                                            (нужен SEOBOT_API_KEY в .env.local)
//
// Скрипт идемпотентен: повторный запуск с тем же slug заменяет существующий пост.
//
// С переносом живой интеграции SEObot (lib/seobot.mjs) этот массив стал
// статичным снимком/резервом: /blog, /blog/<slug>, sitemap.xml и llms.txt
// теперь собираются из lib/blog.js (живые статьи SEObot + этот массив).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Общий пайплайн очистки/нормализации статей SEObot — тот же модуль, что
// использует живой блог (lib/seobot.mjs), чтобы статичный снимок и живая
// версия статьи обрабатывались одинаково.
import {
  cleanHtml,
  computeReadTime,
  extractJsonLd,
  isUsableImage,
  normalizeSeobotArticle,
  toDateParts,
} from '../lib/seobot.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'lib', 'blogPosts.js');

// ---------- Разбор текстового дампа SEObot ----------

function parseDump(text) {
  const pick = (re) => (text.match(re) || [])[1] || '';
  const slug = pick(/^Slug:[ \t]*(.+)$/m).trim();
  const title = pick(/^Page Title:[ \t]*(.+)$/m).trim();
  const description = pick(/^Meta Description:[ \t]*(.+)$/m).trim();
  const keywordsRaw = pick(/^Meta Keywords:[ \t]*(.+)$/m).trim();
  const image = pick(/^(?:Image|Hero Image):[ \t]*(\S+)$/m).trim();
  const mainMatch = text.match(/^Main text:[ \t]*$/m);
  if (!slug || !title || !mainMatch) {
    throw new Error(
      'В файле не найдены обязательные поля Slug / Page Title / Main text. ' +
        'Проверьте, что это выгрузка статьи из SEObot.'
    );
  }
  const html = text.slice(text.indexOf(mainMatch[0]) + mainMatch[0].length);
  const keywords = keywordsRaw
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  return { slug, title, description, keywords, image, html };
}

// ---------- Очистка HTML и вспомогательные преобразования ----------
//
// extractJsonLd, cleanHtml, computeReadTime, toDateParts и isUsableImage
// живут в lib/seobot.mjs (общий пайплайн с живым блогом) — импортированы выше.

// ---------- Экранирование для вставки в JS-файл ----------

const sq = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const tpl = (s) =>
  '`' + s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`';

// ---------- Генерация текста нового объекта-поста ----------

function buildPostEntry(post) {
  const lines = [];
  lines.push('  {');
  lines.push(`    slug: ${sq(post.slug)},`);
  lines.push(`    title: ${sq(post.title)},`);
  if (post.description) lines.push(`    description: ${sq(post.description)},`);
  if (post.keywords.length) {
    lines.push(`    keywords: [${post.keywords.map(sq).join(', ')}],`);
  }
  if (post.image) lines.push(`    image: ${sq(post.image)},`);
  lines.push(`    dateLabel: ${sq(post.dateLabel)},`);
  lines.push(`    date: ${sq(post.date)},`);
  lines.push(`    readTime: ${sq(post.readTime)},`);
  if (post.faqSchema) {
    const json = JSON.stringify(post.faqSchema, null, 2)
      .split('\n')
      .map((l, i) => (i === 0 ? l : `    ${l}`))
      .join('\n');
    lines.push(`    faqSchema: ${json},`);
  }
  lines.push('    content: [');
  lines.push('      {');
  lines.push("        type: 'html',");
  lines.push(`        html: ${tpl(post.html)},`);
  lines.push('      },');
  lines.push('    ],');
  lines.push('  },');
  return lines.join('\n');
}

// ---------- Вставка/замена поста в lib/blogPosts.js ----------

function upsertInBlogPosts(entryText, slug) {
  const source = fs.readFileSync(TARGET, 'utf8');
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const lines = source.split(/\r?\n/);
  const slugLine = `    slug: '${slug}',`;

  const slugIdx = lines.indexOf(slugLine);
  if (slugIdx !== -1) {
    let start = slugIdx;
    while (start >= 0 && lines[start] !== '  {') start -= 1;
    let end = slugIdx;
    while (end < lines.length && lines[end] !== '  },') end += 1;
    if (start < 0 || end >= lines.length) {
      throw new Error(`Не удалось найти границы существующего поста "${slug}" в lib/blogPosts.js.`);
    }
    lines.splice(start, end - start + 1, ...entryText.split('\n'));
    console.log(`↻ Пост "${slug}" уже был в массиве — заменён актуальной версией.`);
    return lines.join(eol);
  }

  const closeIdx = lines.lastIndexOf('];');
  if (closeIdx === -1) {
    throw new Error('Не найден конец массива blogPosts (строка "];").');
  }
  lines.splice(closeIdx, 0, ...entryText.split('\n'));
  console.log(`+ Пост "${slug}" добавлен в массив blogPosts.`);
  return lines.join(eol);
}

// ---------- Сборка поста из дамп-файла / из SEObot API ----------

function buildPostFromDump(parsed, opts) {
  const { html, warnings } = cleanHtml(parsed.html);
  if (!html) throw new Error('Main text пуст после очистки — нечего сохранять.');
  for (const w of warnings) console.warn(`  ⚠ ${w}`);
  const { date, dateLabel } = toDateParts(opts.date);
  return {
    slug: parsed.slug,
    title: parsed.title,
    description: parsed.description,
    keywords: parsed.keywords,
    image: isUsableImage(parsed.image) ? parsed.image : '',
    dateLabel,
    date,
    readTime: computeReadTime(html),
    faqSchema: extractJsonLd(parsed.html),
    html,
  };
}

// Пост из статьи SEObot API собирает общий normalizeSeobotArticle
// (lib/seobot.mjs) — тот же пайплайн, что и на живом сайте.

function writePost(post) {
  const entryText = buildPostEntry(post);
  const nextSource = upsertInBlogPosts(entryText, post.slug);
  fs.writeFileSync(TARGET, nextSource, 'utf8');
  console.log(`  title:   ${post.title}`);
  console.log(`  дата:    ${post.date} (${post.dateLabel})`);
  console.log(`  объём:   ${post.readTime}`);
  if (post.image) console.log(`  image:   ${post.image}`);
}

function runFileMode(fileArg, opts) {
  const file = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(file)) throw new Error(`Файл не найден: ${file}`);
  const parsed = parseDump(fs.readFileSync(file, 'utf8'));
  writePost(buildPostFromDump(parsed, opts));
}

async function runApiMode() {
  const apiKey = process.env.SEOBOT_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Не задан SEOBOT_API_KEY. Добавьте его в .env.local (SEOBOT_API_KEY=...) или в переменные окружения.'
    );
  }
  const seobot = await import('seobot');
  const BlogClient = seobot.BlogClient || seobot.default?.BlogClient;
  const client = new BlogClient(apiKey);

  const articles = [];
  let page = 0;
  for (;;) {
    const { articles: batch, total } = await client.getArticles(page, 50);
    if (!batch || batch.length === 0) break;
    for (const short of batch) {
      const full = await client.getArticle(short.slug);
      if (!full || full.deleted || full.published === false || !full.html) continue;
      articles.push(full);
    }
    page += 1;
    if (page * 50 >= total) break;
  }
  if (!articles.length) {
    throw new Error('SEObot API не вернул ни одной подходящей статьи.');
  }

  let saved = 0;
  for (const article of articles) {
    const post = normalizeSeobotArticle(article, {
      onWarning: (msg) => console.warn(`  ⚠ ${article.slug}: ${msg}`),
    });
    if (!post) continue;
    writePost(post);
    saved += 1;
  }
  console.log(`✓ Готово: обработано статей — ${saved}.`);
}

// ---------- CLI ----------

function loadEnvFile() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const opts = {
    date: (args.find((a) => a.startsWith('--date=')) || '').split('=')[1] || '',
  };
  const positional = args.filter((a) => !a.startsWith('--'));

  if (args.includes('--api')) {
    loadEnvFile();
    await runApiMode();
    return;
  }
  if (positional.length === 0) {
    console.log(
      'Использование:\n' +
        '  npm run blog:add -- scripts/posts/<файл>.txt   — сохранить пост из выгрузки SEObot\n' +
        '  npm run blog:sync                              — синхронизировать все статьи из SEObot API\n' +
        'Опция: --date=YYYY-MM-DD — дата публикации (по умолчанию сегодня).'
    );
    return;
  }
  runFileMode(positional[0], opts);
}

main().catch((err) => {
  console.error('Ошибка:', err.message);
  process.exit(1);
});