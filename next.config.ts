import type { NextConfig } from "next";

// sharp ships its native libvips library as a separate platform package. Vercel's file tracing was leaving it out of the
// deployed functions ("libvips-cpp.so … cannot open shared object file"), so include the Linux builds explicitly.
const SHARP_FILES = [
  './node_modules/@img/sharp-libvips-linux-x64/**/*',
  './node_modules/@img/sharp-linux-x64/**/*',
];

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/generate-study-guide': SHARP_FILES,
    '/api/extract-image-text': SHARP_FILES,
    '/api/health': SHARP_FILES,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
