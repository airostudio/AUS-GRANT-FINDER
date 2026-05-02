/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@ausgrant/ai-engine', '@ausgrant/database'],

  // Security
  poweredByHeader: false, // Don't expose Next.js in headers

  // Performance
  compress: true, // Enable gzip compression

  // Image optimization (disable if not using next/image to prevent DoS)
  images: {
    unoptimized: false,
    remotePatterns: [], // Explicitly empty - no remote images allowed
  },

  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb', // Reduced from 10mb for security
    },
  },

  // Logging (production-ready)
  logging: {
    fetches: {
      fullUrl: false, // Don't log full URLs (may contain sensitive params)
    },
  },

  // Headers (additional to middleware)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
