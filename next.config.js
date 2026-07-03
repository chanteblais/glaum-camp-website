/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint is not configured in this project, so skip it during builds.
  eslint: { ignoreDuringBuilds: true },
  async redirects() {
    return [
      // The Participate page moved (2026-07-02); old links/bookmarks/emails
      // may still say /signup. (The Clerk /sign-up page is unrelated.)
      { source: '/signup', destination: '/participate', permanent: true },
    ];
  },
};

module.exports = nextConfig;
