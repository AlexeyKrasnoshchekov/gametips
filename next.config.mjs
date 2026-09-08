/** @type {import('next').NextConfig} */
// const nextConfig = {
//   reactStrictMode: true,
// };

// export default nextConfig;

// import type { NextConfig } from 'next';

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Turn off disk caching for dev, build, or both
    turbopackFileSystemCacheForDev: false,
    turbopackFileSystemCacheForBuild: false,
  },
};

export default nextConfig;
