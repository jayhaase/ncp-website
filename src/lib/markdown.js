import { Marked } from 'marked';

const marked = new Marked({
  gfm: true,
  breaks: false
});

/** Open external links rendered from Markdown in a new tab. Skips in-page
 *  anchors (`#foo`) and `mailto:` / `tel:` links where a new tab is wrong. */
marked.use({
  renderer: {
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
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
  return marked.parse(source);
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
  return marked.parseInline(source);
}
