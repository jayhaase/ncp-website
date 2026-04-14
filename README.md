# Nature Connected Professionals Website

Static Astro website for Netlify deployment with Contentful-managed content fetched at build time.

## Architecture

- Runtime: static HTML/CSS/JS from Astro
- CMS: Contentful Delivery API
- Content sync: `scripts/fetch-contentful.mjs`
- Generated data file: `src/data/content.generated.json`

The deployed site does not call Contentful at runtime. Content is fetched during `sync-content` and rendered from local generated JSON.

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
3. Start dev server with file watching:
   ```bash
   npm run dev
   ```
4. Refresh generated content manually when needed:
   ```bash
   npm run sync-content
   ```

## Seed Contentful from fallback JSON

If you want to rebuild Contentful from the local generated content (`src/data/content.generated.json`):

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
- Home hero image comes from `homePage.heroImage` (Asset); the build output uses a resolved URL plus a static placeholder if no asset is set.

## Build and deploy

- Build command: `npm run build`
- Publish directory: `dist`

These are configured in `netlify.toml`.

**GitHub Pages (project site):** `astro.config.mjs` sets `base` to `/${repo}/` when the GitHub Actions workflow runs (`GITHUB_ACTIONS` + `GITHUB_REPOSITORY`). Internal links and `public/` assets go through `src/lib/sitePath.js` so URLs work under `https://<user>.github.io/<repo>/`.

## Routes in v1

- `/` Home
- `/about` Standard page
- `/gatherings` Events page with upcoming sections
- `/connect` Standard page

## Contentful content model (v1)

### `siteSettings` (single entry)
- `organizationName` (short text)
- `footerText` (short/long text)
- `primaryCtaLabel` (short text)
- `primaryCtaUrl` (short text)

Navigation links are defined in code (`src/lib/navLinks.js`), not in Contentful.

### `homePage` (single entry)
- `heroTitle` (short text)
- `heroSubtitle` (long text)
- `heroImage` (media / Asset)
- `heroImageAlt` (short text)
- `mission` (long text)
- `howItWorks` (list of short/long text)
- `highlightCards` or `highlights` (references)

### `infoCard` (multiple)
- `title` (short text)
- `description` (long text)
- `href` (short text, optional) — internal path or external URL for an optional “Learn more” control

### `standardPage` (multiple)
- `slug` (short text)
- `title` (short text)
- `intro` (long text)
- `infoCards` (references to `infoCard`)
- `sectionBlocks` (references)

### `event` (multiple)
- `slug` (short text)
- `title` (short text)
- `startDate` (date/time)
- `endDate` (date/time, optional)
- `location` (short/long text)
- `summary` (long text)
- `details` (long text)
- `registrationUrl` (short text, optional)
- `image` (media / Asset)

Upcoming vs past in the app is derived from dates: an event is **past** after its end time (`endDate` if set, otherwise `startDate`).

## Fallback behavior

If Contentful variables are missing or API calls fail, the sync script writes fallback content so local dev and production builds still succeed.
