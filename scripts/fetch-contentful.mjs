import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outFile = path.join(projectRoot, 'src', 'data', 'content.generated.json');

loadDotEnv(path.join(projectRoot, '.env'));

const FALLBACK_CONTENT = {
  siteSettings: {
    organizationName: 'Nature Connected Professionals',
    footerText: 'Nature Connected Professionals',
    primaryCta: {
      label: 'Join the community',
      url: '/connect'
    }
  },
  homePage: {
    title: 'Gathering people who help others connect with nature.',
    description: '',
    heroImageUrl: '/images/placeholders/hero-nature.svg',
    heroImageAlt: 'Placeholder illustration for homepage hero',
    mission:
      'We gather to cultivate depth through community building, engage broadly through networking, and steward care for life by generously sharing skills, knowledge, and lived experience.',
    howItWorks: [],
    highlightCards: [
      {
        title: 'For everyone',
        description: 'A professional community for people weaving nature connection into their work or volunteerism.'
      },
      {
        title: 'Rooted in practice',
        description: 'Tools, stories, and methods are shared in plain language and grounded in experience.'
      },
      {
        title: 'Participation first',
        description: 'Join events, contribute ideas, and help shape the direction of the community.'
      }
    ]
  },
  pages: [],
  events: [],
  directoryMembers: []
};

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const text = readFileSyncSafe(filePath);
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const idx = line.indexOf('=');
    if (idx === -1) {
      continue;
    }

    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^"|"$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function readFileSyncSafe(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function env(name, fallback = '') {
  return process.env[name] || fallback;
}

function hasGeneratedSnapshot() {
  return existsSync(outFile);
}

function isStrictSyncMode() {
  return (
    env('CONTENT_SYNC_STRICT') === 'true' ||
    env('GITHUB_ACTIONS') === 'true' ||
    env('CI') === 'true'
  );
}

async function ensureBootstrapFallback() {
  if (hasGeneratedSnapshot()) {
    return false;
  }

  return writeGenerated(FALLBACK_CONTENT);
}

function toPlainText(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toPlainText(item)).filter(Boolean).join('\n');
  }

  if (value.nodeType && Array.isArray(value.content)) {
    const pieces = value.content.map((node) => toPlainText(node));
    if (value.nodeType === 'paragraph' || value.nodeType === 'list-item') {
      return pieces.join('').trim();
    }
    return pieces.filter(Boolean).join('\n').trim();
  }

  if (value.nodeType === 'text') {
    return value.value || '';
  }

  if (value.value && typeof value.value === 'string') {
    return value.value;
  }

  return '';
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function getLinkedEntryMap(response) {
  const map = new Map();
  for (const item of toArray(response?.items)) {
    if (item?.sys?.id) {
      map.set(item.sys.id, item);
    }
  }
  for (const item of toArray(response?.includes?.Entry)) {
    if (item?.sys?.id) {
      map.set(item.sys.id, item);
    }
  }
  return map;
}

function getLinkedAssetMap(response) {
  const map = new Map();
  for (const item of toArray(response?.includes?.Asset)) {
    if (item?.sys?.id) {
      map.set(item.sys.id, item);
    }
  }
  return map;
}

function resolveLinkedEntries(fieldValue, map) {
  return toArray(fieldValue)
    .map((item) => item?.sys?.id)
    .filter(Boolean)
    .map((id) => map.get(id))
    .filter(Boolean);
}

function normalizeAssetUrl(url) {
  if (!url || typeof url !== 'string') {
    return '';
  }
  if (url.startsWith('//')) {
    return `https:${url}`;
  }
  return url;
}

function extractAssetUrl(fieldValue, assetMap) {
  if (!fieldValue) {
    return '';
  }

  if (typeof fieldValue === 'string') {
    return normalizeAssetUrl(fieldValue);
  }

  const directUrl = fieldValue?.fields?.file?.url;
  if (directUrl) {
    return normalizeAssetUrl(directUrl);
  }

  const linkedId = fieldValue?.sys?.id;
  if (linkedId && assetMap.has(linkedId)) {
    return normalizeAssetUrl(assetMap.get(linkedId)?.fields?.file?.url);
  }

  return '';
}

function pickFieldString(fields, ...keys) {
  for (const key of keys) {
    const v = fields?.[key];
    if (v != null && String(v).trim()) {
      return String(v).trim();
    }
  }
  return '';
}

function normalizeWebsiteUrl(raw) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) {
    return '';
  }
  if (/^https?:\/\//i.test(s)) {
    return s;
  }
  if (/^\/\//.test(s)) {
    return `https:${s}`;
  }
  return `https://${s}`;
}

function normalizePhotoUrlString(raw) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) {
    return '';
  }
  if (/^https?:\/\//i.test(s)) {
    return s;
  }
  if (/^\/\//.test(s)) {
    return `https:${s}`;
  }
  if (s.startsWith('/')) {
    return s;
  }
  return '';
}

/**
 * Maps Contentful `directoryMember` entries to the site's directory shape.
 * Preferred field ids: firstName, lastName, email, organization, website, pronouns,
 * services, natureBasedCertifications, photo (Asset).
 */
function mapDirectoryMembers(directoryResponse) {
  const assetMap = getLinkedAssetMap(directoryResponse);
  const members = toArray(directoryResponse?.items)
    .map((item) => {
      const f = item.fields || {};
      let firstName = pickFieldString(f, 'firstName', 'givenName');
      let lastName = pickFieldString(f, 'lastName', 'familyName', 'surname');
      const combined = pickFieldString(f, 'name', 'displayName', 'fullName');
      if (!firstName && !lastName && combined) {
        const idx = combined.lastIndexOf(' ');
        if (idx === -1) {
          firstName = combined;
        } else {
          firstName = combined.slice(0, idx).trim();
          lastName = combined.slice(idx + 1).trim();
        }
      }

      const email = pickFieldString(f, 'email', 'emailAddress');
      const organization = toPlainText(f.organization || f.companyName || f.orgName);
      const websiteRaw = pickFieldString(f, 'website', 'websiteUrl', 'url', 'webSite');
      const website = normalizeWebsiteUrl(websiteRaw) || '';
      const pronouns = pickFieldString(f, 'pronouns');
      const services = toPlainText(f.services || f.servicesOffered || f.aboutServices);
      const certifications = toPlainText(
        f.natureBasedCertifications || f.certifications || f.credentials || f.natureBasedCertification
      );

      const photoAssetUrl = extractAssetUrl(f.photo || f.headshot || f.image || f.profileImage, assetMap);
      const photoString = normalizePhotoUrlString(
        pickFieldString(f, 'photoUrl', 'imageUrl', 'headshotUrl')
      );
      const photoUrl = photoAssetUrl || photoString || null;

      const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || combined || 'Member';

      return {
        email,
        firstName,
        lastName,
        organization,
        website: website || null,
        pronouns,
        services,
        certifications,
        displayName,
        photoUrl
      };
    })
    .filter((m) => m.firstName || m.lastName || m.organization || m.email || m.website);

  return members;
}

function createClient() {
  const spaceId = env('CONTENTFUL_SPACE_ID');
  const token = env('CONTENTFUL_DELIVERY_TOKEN');
  const environment = env('CONTENTFUL_ENVIRONMENT', 'master');

  if (!spaceId || !token) {
    return null;
  }

  const baseUrl = `https://cdn.contentful.com/spaces/${spaceId}/environments/${environment}`;

  return async (pathName, query = {}) => {
    const params = new URLSearchParams(query);
    const url = `${baseUrl}${pathName}?${params.toString()}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`Contentful request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  };
}

function mapHighlightCards(homeItem, linkMap) {
  const field = homeItem?.fields?.highlightCards || homeItem?.fields?.highlights;
  const linked = resolveLinkedEntries(field, linkMap);

  const cards = linked
    .map((item) => ({
      title: item.fields?.title || item.fields?.heading,
      description: toPlainText(item.fields?.description || item.fields?.body)
    }))
    .filter((item) => item.title);

  if (cards.length) {
    return cards;
  }

  const inline = toArray(field)
    .map((item) => ({
      title: item?.fields?.title || item?.title,
      description: toPlainText(item?.fields?.description || item?.description)
    }))
    .filter((item) => item.title);

  return inline.length ? inline : FALLBACK_CONTENT.homePage.highlightCards;
}

function mapSectionBlocks(pageItem, linkMap) {
  const sectionField = pageItem?.fields?.sectionBlocks || pageItem?.fields?.sections;
  const linkedSections = resolveLinkedEntries(sectionField, linkMap);

  const sections = linkedSections.map((entry) => {
    const cardField = entry.fields?.cards || [];
    const linkedCards = resolveLinkedEntries(cardField, linkMap);
    const cards = linkedCards
      .map((card) => ({
        title: card.fields?.title || card.fields?.heading,
        description: toPlainText(card.fields?.description || card.fields?.body)
      }))
      .filter((card) => card.title);

    const listItems = toArray(entry.fields?.listItems)
      .map((item) => toPlainText(item))
      .filter(Boolean);

    return {
      heading: entry.fields?.heading || entry.fields?.title || '',
      bodyText: toPlainText(entry.fields?.body || entry.fields?.content || entry.fields?.description),
      cards,
      listItems
    };
  });

  return sections.filter((section) => section.heading || section.bodyText || section.cards.length || section.listItems.length);
}

function mapInfoCards(pageItem, linkMap) {
  const raw = pageItem?.fields?.infoCards ?? pageItem?.fields?.infoCard;
  const field = Array.isArray(raw) ? raw : raw?.sys?.type === 'Link' ? [raw] : [];
  const linked = resolveLinkedEntries(field, linkMap);
  return linked
    .map((entry) => ({
      title: entry.fields?.title || entry.fields?.heading || '',
      description: toPlainText(entry.fields?.description || entry.fields?.body),
      href: entry.fields?.href || entry.fields?.url || ''
    }))
    .filter((card) => card.title || card.description);
}

function mapSiteSettings(siteResponse) {
  const siteItem = siteResponse?.items?.[0];
  if (!siteItem) {
    return FALLBACK_CONTENT.siteSettings;
  }

  return {
    organizationName: siteItem.fields?.organizationName || siteItem.fields?.siteName || FALLBACK_CONTENT.siteSettings.organizationName,
    footerText: toPlainText(siteItem.fields?.footerText) || FALLBACK_CONTENT.siteSettings.footerText,
    primaryCta: {
      label:
        siteItem.fields?.primaryCtaLabel ||
        siteItem.fields?.ctaLabel ||
        FALLBACK_CONTENT.siteSettings.primaryCta.label,
      url:
        siteItem.fields?.primaryCtaUrl ||
        siteItem.fields?.ctaUrl ||
        FALLBACK_CONTENT.siteSettings.primaryCta.url
    }
  };
}

function mapHomePage(homeResponse) {
  const homeItem = homeResponse?.items?.[0];
  if (!homeItem) {
    return FALLBACK_CONTENT.homePage;
  }

  const linkMap = getLinkedEntryMap(homeResponse);
  const assetMap = getLinkedAssetMap(homeResponse);

  return {
    title: homeItem.fields?.heroTitle || homeItem.fields?.title || FALLBACK_CONTENT.homePage.title,
    description:
      toPlainText(homeItem.fields?.heroSubtitle || homeItem.fields?.description) ||
      FALLBACK_CONTENT.homePage.description,
    heroImageUrl:
      extractAssetUrl(homeItem.fields?.heroImage, assetMap) ||
      FALLBACK_CONTENT.homePage.heroImageUrl,
    heroImageAlt: homeItem.fields?.heroImageAlt || FALLBACK_CONTENT.homePage.heroImageAlt,
    mission: toPlainText(homeItem.fields?.mission) || FALLBACK_CONTENT.homePage.mission,
    howItWorks: toArray(homeItem.fields?.howItWorks)
      .map((item) => toPlainText(item))
      .filter(Boolean),
    highlightCards: mapHighlightCards(homeItem, linkMap)
  };
}

function mapPages(pageResponse) {
  const linkMap = getLinkedEntryMap(pageResponse);
  const assetMap = getLinkedAssetMap(pageResponse);
  const pages = toArray(pageResponse?.items)
    .map((item) => {
      const heroImageUrl = extractAssetUrl(
        item.fields?.image ?? item.fields?.heroImage,
        assetMap
      );
      const title = item.fields?.title;
      const heroImageAlt =
        pickFieldString(item.fields, 'imageAlt', 'heroImageAlt') ||
        (title ? `Hero image for ${title}` : 'Page hero image');

      return {
        slug: item.fields?.slug,
        title,
        intro: toPlainText(item.fields?.intro || item.fields?.description),
        ...(heroImageUrl ? { heroImageUrl, heroImageAlt } : {}),
        infoCards: mapInfoCards(item, linkMap),
        sections: mapSectionBlocks(item, linkMap)
      };
    })
    .filter((page) => page.slug && page.title);

  return pages;
}

function mapEvents(eventResponse) {
  const assetMap = getLinkedAssetMap(eventResponse);
  const events = toArray(eventResponse?.items)
    .map((item) => ({
      title: item.fields?.title,
      whenText: toPlainText(item.fields?.whenText || item.fields?.whenDisplay || item.fields?.dateText),
      season: pickFieldString(item.fields, 'season'),
      year: (() => {
        const y = item.fields?.year;
        return y == null || y === '' ? '' : String(y).trim();
      })(),
      location: toPlainText(item.fields?.location),
      summary: toPlainText(item.fields?.summary),
      details: toPlainText(item.fields?.details),
      specialInfo: toPlainText(item.fields?.specialInfo),
      registrationUrl: item.fields?.registrationUrl || item.fields?.registrationLink || '',
      image: extractAssetUrl(item.fields?.image, assetMap)
    }))
    .filter((event) => event.title);

  return events;
}

function normalizeContent(siteResponse, homeResponse, pageResponse, eventResponse, directoryResponse) {
  const siteSettings = mapSiteSettings(siteResponse);
  const homePage = mapHomePage(homeResponse);

  return {
    siteSettings,
    homePage: {
      ...FALLBACK_CONTENT.homePage,
      ...homePage
    },
    pages: mapPages(pageResponse),
    events: mapEvents(eventResponse),
    directoryMembers: mapDirectoryMembers(directoryResponse)
  };
}

async function writeGenerated(content) {
  await mkdir(path.dirname(outFile), { recursive: true });
  const next = `${JSON.stringify(content, null, 2)}\n`;

  try {
    const current = await readFile(outFile, 'utf8');
    if (current === next) {
      return false;
    }
  } catch {
    // File may not exist on first run.
  }

  await writeFile(outFile, next, 'utf8');
  return true;
}

async function run() {
  const client = createClient();
  const strictSync = isStrictSyncMode();

  if (!client) {
    if (strictSync) {
      throw new Error('Contentful credentials are required for strict builds.');
    }

    const changed = await ensureBootstrapFallback();
    console.log(
      changed
        ? 'Contentful credentials missing. Bootstrapped fallback content because no snapshot exists.'
        : 'Contentful credentials missing. Using existing generated snapshot.'
    );
    return;
  }

  try {
    const [siteResponse, homeResponse, pageResponse, eventResponse, directoryResponse] = await Promise.all([
      client('/entries', {
        content_type: 'siteSettings',
        limit: '1',
        include: '3'
      }),
      client('/entries', {
        content_type: 'homePage',
        limit: '1',
        include: '3'
      }),
      client('/entries', {
        content_type: 'standardPage',
        limit: '200',
        include: '3'
      }),
      client('/entries', {
        content_type: 'event',
        limit: '300',
        include: '2'
      }),
      client('/entries', {
        content_type: 'directoryMember',
        limit: '300',
        include: '2'
      })
    ]);

    const content = normalizeContent(
      siteResponse,
      homeResponse,
      pageResponse,
      eventResponse,
      directoryResponse
    );
    const changed = await writeGenerated(content);
    console.log(
      changed
        ? 'Content sync complete. Updated src/data/content.generated.json'
        : 'Content sync complete. No content changes detected.'
    );
  } catch (error) {
    if (strictSync) {
      throw new Error(`Contentful sync failed in strict mode: ${error.message}`, { cause: error });
    }

    const changed = await ensureBootstrapFallback();
    console.log(
      changed
        ? `Contentful sync failed. Bootstrapped fallback content because no snapshot exists: ${error.message}`
        : `Contentful sync failed. Preserving existing generated snapshot: ${error.message}`
    );
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
