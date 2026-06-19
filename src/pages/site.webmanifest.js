import { sitePath } from '../lib/sitePath.js';

export function GET() {
  const manifest = {
    name: 'Nature Connected Professionals',
    short_name: 'NCP',
    start_url: sitePath('/'),
    display: 'standalone',
    background_color: '#efeee7',
    theme_color: '#1f5f43',
    icons: [
      {
        src: sitePath('/favicon.svg'),
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any'
      }
    ]
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8'
    }
  });
}
