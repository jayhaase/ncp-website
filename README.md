# Nature Connected Professionals Website

Static Astro site deployed to GitHub Pages, with visible site content sourced from Contentful at build time.

## Architecture

- Runtime: static HTML/CSS/JS from Astro
- Hosting: GitHub Pages via `.github/workflows/deploy-pages.yml`
- CMS: Contentful Delivery API
- Content sync: `scripts/fetch-contentful.mjs`
- Generated snapshot: `src/data/content.generated.json`

The deployed site does not call Contentful at runtime. Contentful data is fetched during `npm run sync-content` and rendered from the generated JSON snapshot.

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Refresh the generated Contentful snapshot when needed:
   ```bash
   npm run sync-content
   ```

### Local sync behavior

- If Contentful credentials are present and valid, `npm run sync-content` updates `src/data/content.generated.json`.
- If credentials are missing or Contentful is temporarily unavailable, local sync preserves the checked-in snapshot instead of overwriting it.
- If no snapshot exists yet, local sync bootstraps fallback content so the site can still start.
- To make local sync fail hard like CI, set `CONTENT_SYNC_STRICT=true`.

## Build and deploy

### Local build

- `npm run build` runs Contentful sync and then `astro build`.
- `npm run build:site` runs only `astro build` against the current generated snapshot.
- `npm run check` runs `astro check`.

### GitHub Pages deployment

GitHub Pages deploys from `.github/workflows/deploy-pages.yml`.

- CI runs `npm run check`.
- CI runs `npm run sync-content` as a separate step.
- CI fails if Contentful credentials are missing or the sync request fails.
- CI then runs `npm run build:site` and uploads `dist/` to GitHub Pages.

`astro.config.mjs` sets `site` and `base` so the site works for both the production domain and GitHub Pages project-site paths. Internal links and asset URLs should go through `src/lib/sitePath.js`.

## Content ownership

- Contentful is the source of truth for homepage copy, CTA content, standard pages, and events.
- Navigation links remain code-owned in `src/lib/navLinks.js`.
- Markdown from Contentful is sanitized before rendering.

## Seed Contentful from the generated snapshot

If you want to rebuild Contentful from `src/data/content.generated.json`:

1. Add a Contentful Management API token to `.env`:
   ```bash
   CONTENTFUL_MANAGEMENT_TOKEN=your_content_management_token
   ```
2. Run:
   ```bash
   npm run seed-contentful
   ```

Notes:
- `seed-contentful` is destructive by design: it deletes all entries, assets, and content types in the target environment first.
- After clearing, it recreates and publishes these content types: `siteSettings`, `homePage`, `infoCard`, `standardPage`, `event`.
- Then it seeds and publishes entries from `src/data/content.generated.json`.

## Main routes

- `/` Home
- `/about` Standard page
- `/gatherings` Events page
- `/gatherings/2026-unconference` Standalone event page
- `/directory` Member directory
- `/connect` Standard page

## Contentful content model

### `siteSettings`
- `organizationName`
- `footerText`
- `primaryCtaLabel`
- `primaryCtaUrl`

### `homePage`
- `heroTitle`
- `heroSubtitle`
- `heroImage`
- `heroImageAlt`
- `mission`
- `howItWorks`
- `highlightCards` or `highlights`

### `infoCard`
- `title`
- `description`
- `href`

### `standardPage`
- `slug`
- `title`
- `intro`
- `infoCards`
- `sectionBlocks`

### `event`
- `slug`
- `title`
- `startDate`
- `endDate`
- `location`
- `summary`
- `details`
- `registrationUrl`
- `image`

Upcoming vs. past in the app is derived from dates: an event is past after its `endDate`, or `startDate` when no end date exists.
