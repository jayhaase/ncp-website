import { sitePath } from '../lib/sitePath.js';

export function GET() {
  const sitemapUrl = new URL(sitePath('/sitemap.xml'), import.meta.env.SITE).toString();
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl}\n`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}
