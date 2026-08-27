/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 16's `next dev` writes AGENTS.md/CLAUDE.md at the repo root unless
  // disabled; agent guidance lives in docs/ here, so keep the tree clean.
  agentRules: false,
  async redirects() {
    return [
      // The Participate page moved (2026-07-02); old links/bookmarks/emails
      // may still say /signup. (The Clerk /sign-up page is unrelated.)
      { source: '/signup', destination: '/participate', permanent: true },
    ];
  },
};

module.exports = nextConfig;
