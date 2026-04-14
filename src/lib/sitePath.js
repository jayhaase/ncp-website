const BASE = import.meta.env.BASE_URL;

/**
 * Root-relative URL including Astro `base` (e.g. `/ncp-website/about` on GitHub project Pages).
 * @param {string} path Path starting with `/`, or `/` for home.
 */
export function sitePath(path) {
  if (!path || path === '/') {
    return BASE;
  }
  const clean = path.replace(/^\/+/, '');
  return `${BASE}${clean}`;
}

/**
 * `public/` asset URL with base prefix. Leaves `http(s)://` and `//` URLs unchanged.
 * @param {string} path e.g. `/images/foo.svg`
 */
export function assetUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('//')) return path;
  const clean = path.replace(/^\/+/, '');
  return `${BASE}${clean}`;
}

/**
 * Link `href`: internal paths get the base; absolute external URLs unchanged.
 * @param {string} href
 */
export function resolveHref(href) {
  if (!href) return BASE;
  if (
    /^https?:\/\//i.test(href) ||
    href.startsWith('//') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')
  ) {
    return href;
  }
  return sitePath(href.startsWith('/') ? href : `/${href}`);
}

/**
 * Whether the current request path matches a nav item `href` like `/about` (ignores trailing slashes).
 * @param {string} pathname `Astro.url.pathname`
 * @param {string} navHref e.g. `/gatherings`
 */
export function pathMatchesNav(pathname, navHref) {
  const baseStripped = BASE.replace(/\/+$/, '');
  let rel = pathname;
  if (baseStripped) {
    if (rel === baseStripped || rel === `${baseStripped}/`) {
      rel = '/';
    } else if (rel.startsWith(`${baseStripped}/`)) {
      rel = rel.slice(baseStripped.length);
    }
  }
  if (!rel.startsWith('/')) rel = `/${rel}`;
  const a = rel.replace(/\/+$/, '') || '/';
  const b = (navHref || '/').replace(/\/+$/, '') || '/';
  return a === b;
}
