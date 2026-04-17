import { Marked } from 'marked';

const marked = new Marked({
  gfm: true,
  breaks: false
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
