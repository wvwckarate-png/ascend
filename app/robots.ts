import type { MetadataRoute } from 'next';

// Personal study app: keep it out of search engines.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } };
}
