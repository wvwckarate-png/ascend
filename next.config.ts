import type { NextConfig } from "next";

// sharp ships its native libvips library as a separate platform package. Vercel's file tracing was leaving it out of the
// deployed functions ("libvips-cpp.so … cannot open shared object file"), so include the Linux builds explicitly.
const SHARP_FILES = [
  './node_modules/@img/sharp-libvips-linux-x64/**/*',
  './node_modules/@img/sharp-linux-x64/**/*',
];

// The PDF route renders with a bundled Chromium and reads the study guide stylesheet: keep both out of the bundler and in the function.
const PDF_FILES = [
  './node_modules/@sparticuz/chromium/bin/**/*',
  './app/styles/study-guide.css',
];

const nextConfig: NextConfig = {
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  outputFileTracingIncludes: {
    '/api/generate-study-guide': SHARP_FILES,
    '/api/extract-image-text': SHARP_FILES,
    '/api/health': SHARP_FILES,
    '/api/export-pdf': PDF_FILES,
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
