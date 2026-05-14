const repo = 'glaum-camp-website';
const isProd = process.env.NODE_ENV === 'production';
const useCustomDomain = true;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  basePath: isProd && !useCustomDomain ? `/${repo}` : '',
  assetPrefix: isProd && !useCustomDomain ? `/${repo}/` : '',
  trailingSlash: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

module.exports = nextConfig;
