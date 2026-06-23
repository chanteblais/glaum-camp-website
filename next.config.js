/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint is not configured in this project, so skip it during builds.
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
