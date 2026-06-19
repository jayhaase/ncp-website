import { getRoutableStandardPages } from '../lib/content.js';
import { sitePath } from '../lib/sitePath.js';

const STATIC_PATHS = ['/', '/gatherings', '/directory', '/gatherings/2026-unconference'];

function toAbsoluteUrl(path) {
  return new URL(sitePath(path), import.meta.env.SITE).toString();
}

export function GET() {
  const paths = [
    ...STATIC_PATHS,
    ...getRoutableStandardPages().map((page) => `/${page.slug}`)
  ];

  const urls = [...new Set(paths)]
    .map((path) => `  <url><loc>${toAbsoluteUrl(path)}</loc></url>`)
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8'
    }
  });
}
