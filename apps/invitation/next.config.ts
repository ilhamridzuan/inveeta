import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@inveeta/shared', '@inveeta/api'],
  images: {
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
  },
};

export default nextConfig;
