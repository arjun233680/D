import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The core package ships TypeScript source so both apps share one build-free module.
  transpilePackages: ['@adhyapak/core'],
  reactStrictMode: true,
};

export default nextConfig;
