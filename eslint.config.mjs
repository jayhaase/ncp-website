import js from '@eslint/js';
import globals from 'globals';
import eslintPluginAstro from 'eslint-plugin-astro';

export default [
  {
    ignores: ['dist/**', '.astro/**', 'node_modules/**', 'src/data/content.generated.json']
  },
  js.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    }
  },
  {
    files: ['src/**/*.astro'],
    rules: {
      // This repo sanitizes HTML before rendering CMS-authored Markdown.
      'astro/no-set-html-directive': 'off',
      // Lightbox behavior is intentionally implemented with a small inline script.
      'astro/no-unsafe-inline-scripts': 'off'
    }
  }
];
