# Nature Connected Professionals Website

Static Astro site deployed to GitHub Pages, with visible site content sourced from Contentful at build time.

## Architecture

- Runtime: static HTML/CSS/JS from Astro
- Hosting: GitHub Pages via `.github/workflows/deploy-pages.yml`
- CMS: Contentful Delivery API
- Content sync: `scripts/fetch-contentful.mjs`
- Generated snapshot: `src/data/content.generated.json`

The deployed site does not call Contentful at runtime. Contentful data is fetched during `pnpm run sync-content` and rendered from the generated JSON snapshot.

## Local development

Target runtime: Node `24.17.0` LTS via [.nvmrc](/Users/jayhaase/dev/ncp-website/.nvmrc).

1. Install dependencies:
   ```bash
   corepack enable
   pnpm install
   ```
2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
3. Start the dev server:
   ```bash
   pnpm run dev
   ```
4. Refresh the generated Contentful snapshot when needed:
   ```bash
   pnpm run sync-content
   ```

### Local sync behavior

- If Contentful credentials are present and valid, `pnpm run sync-content` updates `src/data/content.generated.json`.
- `pnpm run dev` runs a one-time Contentful sync before starting Astro.
- Contentful changes made after the dev server is already running still require rerunning `pnpm run sync-content` or restarting `pnpm run dev`.
- If credentials are missing or Contentful is temporarily unavailable, local sync preserves the checked-in snapshot instead of overwriting it.
- If no snapshot exists yet, local sync bootstraps fallback content so the site can still start.
- To make local sync fail hard like CI, set `CONTENT_SYNC_STRICT=true`.
- Package installation is managed by pnpm with a minimum release age of 3 days (`4320` minutes) to reduce supply-chain risk.
- There is a temporary exception for `astro@6.4.8`, because it was explicitly upgraded before the 3-day window elapsed. Remove that exception after June 20, 2026.

## Build and deploy

### Local build

- `pnpm run build` runs Contentful sync and then `astro build`.
- `pnpm run build:site` runs only `astro build` against the current generated snapshot.
- `pnpm run lint` runs ESLint with Astro-aware rules.
- `pnpm run check` runs `astro check`.

### GitHub Pages deployment

GitHub Pages deploys from `.github/workflows/deploy-pages.yml`.

- CI runs Gitleaks before any install/build step to catch committed secrets.
- CI installs dependencies with pnpm under the 3-day minimum release-age policy.
- CI runs on Node `24.17.0` LTS.
- CI runs `pnpm run lint`.
- CI runs `pnpm run check`.
- CI runs `pnpm run sync-content` as a separate step.
- CI fails if Contentful credentials are missing or the sync request fails.
- CI then runs `pnpm run build:site` and uploads `dist/` to GitHub Pages on `main`.

### Contentful-triggered rebuilds

Published content can trigger a GitHub Pages rebuild without a code push.

1. Create a fine-grained GitHub personal access token with access to this repository.
2. Give the token `Contents: read/write` access for the repository so it can call the repository dispatch endpoint.
3. In Contentful, create a webhook for publish and unpublish topics such as:
   - `Entry.publish`
   - `Entry.unpublish`
   - `Asset.publish`
   - `Asset.unpublish`
   - `ContentType.publish`
   - `ContentType.unpublish`
4. Point the webhook URL at:
   ```text
   https://api.github.com/repos/jayhaase/ncp-website/dispatches
   ```
5. Configure these custom headers in the Contentful webhook:
   ```text
   Accept: application/vnd.github+json
   Authorization: Bearer <YOUR_GITHUB_TOKEN>
   X-GitHub-Api-Version: 2026-03-10
   Content-Type: application/json
   ```
6. Set the webhook body to:
   ```json
   {
     "event_type": "contentful-publish",
     "client_payload": {
       "source": "contentful"
     }
   }
   ```

The GitHub Actions workflow listens for `repository_dispatch` events with `event_type: contentful-publish` and performs the same build/deploy flow used for `main` pushes.

`astro.config.mjs` sets `site` and `base` so the site works for both the production domain and GitHub Pages project-site paths. Internal links and asset URLs should go through `src/lib/sitePath.js`.

## Content ownership

- Contentful is the source of truth for homepage copy, CTA content, standard pages, and events.
- Navigation links remain code-owned in `src/lib/navLinks.js`.
- Markdown from Contentful is sanitized before rendering.
- JavaScript package installs are managed by pnpm, not npm.
- Linting is provided by ESLint with `eslint-plugin-astro`.

## Seed Contentful from the generated snapshot

If you want to rebuild Contentful from `src/data/content.generated.json`:

1. Add a Contentful Management API token to `.env`:
   ```bash
   CONTENTFUL_MANAGEMENT_TOKEN=your_content_management_token
   ```
2. Run:
   ```bash
   pnpm run seed-contentful
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
