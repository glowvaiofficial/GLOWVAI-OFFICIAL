const isStaticExport = process.env.DEPLOY_TARGET === 'github-pages';

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isStaticExport ? { output: 'export' } : {}),
  env: {
    CUSTOM_DOMAIN: 'true',
  },
  images: {
    ...(isStaticExport ? { unoptimized: true } : {}),
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

module.exports = nextConfig;
