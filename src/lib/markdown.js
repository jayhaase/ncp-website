import { Marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const marked = new Marked({
  gfm: true,
  breaks: false
});

const SANITIZE_OPTIONS = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img']),
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel', 'title'],
    img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading'],
    '*': ['id']
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard'
};

function isSafeHref(href) {
  const value = String(href || '').trim();
  if (!value) {
    return false;
  }

  return (
    value.startsWith('#') ||
    value.startsWith('/') ||
    value.startsWith('./') ||
    value.startsWith('../') ||
    value.startsWith('?') ||
    /^(https?:|mailto:|tel:)/i.test(value)
  );
}

function sanitizeRenderedHtml(html) {
  return sanitizeHtml(html, {
    ...SANITIZE_OPTIONS,
    transformTags: {
      a: (tagName, attribs) => {
        if (!isSafeHref(attribs.href)) {
          return {
            tagName: 'span',
            attribs: {}
          };
        }

        const safeAttrs = { ...attribs, href: attribs.href };
        const isExternal = /^https?:\/\//i.test(attribs.href);

        if (isExternal) {
          safeAttrs.target = '_blank';
          safeAttrs.rel = 'noopener noreferrer';
        } else {
          delete safeAttrs.target;
          delete safeAttrs.rel;
        }

        return {
          tagName,
          attribs: safeAttrs
        };
      },
      img: (tagName, attribs) => {
        if (!isSafeHref(attribs.src)) {
          return {
            tagName: 'span',
            text: ''
          };
        }

        return {
          tagName,
          attribs: {
            ...attribs,
            loading: attribs.loading || 'lazy'
          }
        };
      }
    }
  });
}

/** Open external links rendered from Markdown in a new tab. Skips in-page
 *  anchors (`#foo`) and `mailto:` / `tel:` links where a new tab is wrong. */
marked.use({
  renderer: {
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      if (!isSafeHref(href)) {
        return text;
      }
      const titleAttr = title ? ` title="${title}"` : '';
      const isExternal = /^https?:\/\//i.test(href) || href?.startsWith('//');
      const targetAttrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${href}"${titleAttr}${targetAttrs}>${text}</a>`;
    }
  }
});

/**
 * Render Markdown as block HTML (paragraphs, lists, headings, etc.).
 * Returns an empty string for empty input.
 * @param {string | null | undefined} source
 * @returns {string}
 */
export function renderMarkdown(source) {
  if (!source || typeof source !== 'string') {
    return '';
  }
  return sanitizeRenderedHtml(marked.parse(source));
}

/**
 * Render Markdown as inline HTML (no surrounding <p> wrapper).
 * Use for short strings like titles, summaries, or location lines.
 * @param {string | null | undefined} source
 * @returns {string}
 */
export function renderMarkdownInline(source) {
  if (!source || typeof source !== 'string') {
    return '';
  }
  return sanitizeRenderedHtml(marked.parseInline(source));
}
