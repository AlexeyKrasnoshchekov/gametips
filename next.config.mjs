/** @type {import('next').NextConfig} */
// const nextConfig = {
//   reactStrictMode: true,
// };

// export default nextConfig;

// import type { NextConfig } from 'next';

const nextConfig = {
  reactStrictMode: true,
  images: {
    // Домены картинок SEObot (герой-изображения и <img> внутри статей) —
    // настройка из примера seobot-nextjs-blog.
    remotePatterns: [
      { protocol: 'https', hostname: '**.seobotai.com' },
      { protocol: 'https', hostname: '**.cloudfront.net' },
    ],
  },
  experimental: {
    // Turn off disk caching for dev, build, or both
    turbopackFileSystemCacheForDev: false,
    turbopackFileSystemCacheForBuild: false,
  },
};

export default nextConfig;
