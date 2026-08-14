import type { NextConfig } from 'next';

/**
 * The website is published as a static export to GitHub Pages, alongside the
 * Expo build. `basePath` matches where Pages serves it from; without it every
 * asset would be requested from the domain root and 404.
 *
 * Set NEXT_PUBLIC_BASE_PATH='' for a local production run.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  // The core package ships TypeScript source so both apps share one build-free module.
  transpilePackages: ['@adhyapak/core'],
  reactStrictMode: true,
  output: 'export',
  basePath: basePath || undefined,
  // Pages has no image optimiser, and every image in this app is a CSS gradient
  // or an emoji anyway.
  images: { unoptimized: true },
  // Pages serves /path/ as /path/index.html.
  trailingSlash: true,
};

export default nextConfig;
