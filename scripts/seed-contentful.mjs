import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const DATA_FILE = path.join(projectRoot, 'src', 'data', 'content.generated.json');

loadDotEnv(path.join(projectRoot, '.env'));

const spaceId = process.env.CONTENTFUL_SPACE_ID;
const managementToken = process.env.CONTENTFUL_MANAGEMENT_TOKEN;
const environment = process.env.CONTENTFUL_ENVIRONMENT || 'master';

if (!spaceId || !managementToken) {
  console.error('Missing required env vars: CONTENTFUL_SPACE_ID and CONTENTFUL_MANAGEMENT_TOKEN');
  process.exit(1);
}

const API_BASE = `https://api.contentful.com/spaces/${spaceId}/environments/${environment}`;

const MODEL_CONTENT_TYPES = [
  {
    id: 'siteSettings',
    name: 'Site Settings',
    description: 'Global site settings.',
    displayField: 'organizationName',
    fields: [
      { id: 'organizationName', name: 'Organization Name', type: 'Symbol', required: true },
      { id: 'footerText', name: 'Footer Text', type: 'Text', required: false },
      { id: 'primaryCtaLabel', name: 'Primary CTA Label', type: 'Symbol', required: false },
      { id: 'primaryCtaUrl', name: 'Primary CTA URL', type: 'Symbol', required: false }
    ]
  },
  {
    id: 'homePage',
    name: 'Home Page',
    description: 'Homepage content and featured references.',
    displayField: 'heroTitle',
    fields: [
      { id: 'heroTitle', name: 'Hero Title', type: 'Text', required: true },
      { id: 'heroSubtitle', name: 'Hero Subtitle', type: 'Text', required: false },
      {
        id: 'heroImage',
        name: 'Hero Image',
        type: 'Link',
        required: false,
        linkType: 'Asset'
      },
      { id: 'heroImageAlt', name: 'Hero Image Alt', type: 'Symbol', required: false },
      { id: 'mission', name: 'Mission', type: 'Text', required: false },
      {
        id: 'howItWorks',
        name: 'How It Works',
        type: 'Array',
        required: false,
        items: { type: 'Symbol' }
      }
    ]
  },
  {
    id: 'standardPage',
    name: 'Standard Page',
    description: 'Reusable standard content pages.',
    displayField: 'title',
    fields: [
      {
        id: 'slug',
        name: 'Slug',
        type: 'Symbol',
        required: true,
        validations: [{ unique: true }]
      },
      { id: 'title', name: 'Title', type: 'Symbol', required: true },
      { id: 'intro', name: 'Intro', type: 'Text', required: false },
      {
        id: 'sections',
        name: 'Sections',
        type: 'Array',
        required: false,
        items: { type: 'Object' }
      }
    ]
  },
  {
    id: 'event',
    name: 'Event',
    description: 'Community gatherings and event listings.',
    displayField: 'title',
    fields: [
      {
        id: 'slug',
        name: 'Slug',
        type: 'Symbol',
        required: true,
        validations: [{ unique: true }]
      },
      { id: 'title', name: 'Title', type: 'Symbol', required: true },
      { id: 'startDate', name: 'Start Date', type: 'Date', required: true },
      { id: 'endDate', name: 'End Date', type: 'Date', required: false },
      { id: 'location', name: 'Location', type: 'Text', required: false },
      { id: 'summary', name: 'Summary', type: 'Text', required: false },
      { id: 'details', name: 'Details', type: 'Text', required: false },
      { id: 'registrationUrl', name: 'Registration URL', type: 'Symbol', required: false },
      {
        id: 'image',
        name: 'Image',
        type: 'Link',
        required: false,
        linkType: 'Asset'
      }
    ]
  }
];

/** @type {Map<string, any>} */
const contentTypeCache = new Map();

const counters = {
  deletedEntries: 0,
  deletedAssets: 0,
  deletedContentTypes: 0,
  createdContentTypes: 0,
  publishedContentTypes: 0,
  created: 0,
  updated: 0,
  published: 0,
  skippedFields: 0
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

async function cma(pathName, { method = 'GET', body, version, contentTypeId } = {}) {
  const headers = {
    Authorization: `Bearer ${managementToken}`
  };

  if (body) {
    headers['Content-Type'] = 'application/vnd.contentful.management.v1+json';
  }

  if (version !== undefined && version !== null) {
    headers['X-Contentful-Version'] = String(version);
  }

  if (contentTypeId) {
    headers['X-Contentful-Content-Type'] = contentTypeId;
  }

  const response = await fetch(`${API_BASE}${pathName}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`CMA ${method} ${pathName} failed: ${response.status} ${text}`);
  }

  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function linkTo(id, linkType = 'Entry') {
  return {
    sys: {
      type: 'Link',
      linkType,
      id
    }
  };
}

function isPrimitive(value) {
  const t = typeof value;
  return t === 'string' || t === 'number' || t === 'boolean';
}

function coerceFieldValue(fieldDef, value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  switch (fieldDef.type) {
    case 'Symbol':
    case 'Text':
    case 'Date':
    case 'Integer':
    case 'Number':
    case 'Boolean': {
      if (isPrimitive(value)) {
        return value;
      }
      return undefined;
    }
    case 'Object': {
      return typeof value === 'object' ? value : undefined;
    }
    case 'Link': {
      const linkType = fieldDef.linkType;
      if (typeof value === 'string' && value) {
        if (value.startsWith('https://') || value.startsWith('http://') || value.startsWith('/')) {
          return undefined;
        }
        return linkTo(value, linkType);
      }
      if (value?.sys?.id && value?.sys?.linkType) {
        return value;
      }
      return undefined;
    }
    case 'Array': {
      if (!Array.isArray(value)) {
        return undefined;
      }

      const itemDef = fieldDef.items || {};
      if (itemDef.type === 'Symbol' || itemDef.type === 'Text') {
        const list = value.filter((item) => isPrimitive(item)).map((item) => String(item));
        return list.length ? list : undefined;
      }

      if (itemDef.type === 'Link') {
        const links = value
          .map((item) => {
            if (typeof item === 'string' && item && !item.startsWith('http') && !item.startsWith('/')) {
              return linkTo(item, itemDef.linkType || 'Entry');
            }
            if (item?.sys?.id && item?.sys?.linkType) {
              return item;
            }
            return null;
          })
          .filter(Boolean);

        return links.length ? links : undefined;
      }

      if (itemDef.type === 'Object') {
        return value.filter((item) => typeof item === 'object' && item !== null);
      }

      return undefined;
    }
    default:
      return undefined;
  }
}

async function getDefaultLocale() {
  const data = await cma('/locales');
  const locale = (data.items || []).find((item) => item.default) || data.items?.[0];
  if (!locale?.code) {
    throw new Error('No locale found in Contentful environment');
  }
  return locale.code;
}

async function getContentType(contentTypeId) {
  if (contentTypeCache.has(contentTypeId)) {
    return contentTypeCache.get(contentTypeId);
  }
  const ct = await cma(`/content_types/${contentTypeId}`);
  contentTypeCache.set(contentTypeId, ct);
  return ct;
}

async function listAll(pathName, limit = 1000) {
  const items = [];
  let skip = 0;

  while (true) {
    const result = await cma(`${pathName}?limit=${limit}&skip=${skip}`);
    const chunk = result.items || [];
    items.push(...chunk);

    if (chunk.length < limit) {
      break;
    }

    skip += limit;
  }

  return items;
}

async function clearEntriesAndAssets() {
  const entries = await listAll('/entries');
  for (const entry of entries) {
    let version = entry.sys.version;

    if (entry.sys.publishedVersion) {
      const unpublished = await cma(`/entries/${entry.sys.id}/published`, {
        method: 'DELETE',
        version
      });
      version = unpublished?.sys?.version || version + 1;
    }

    await cma(`/entries/${entry.sys.id}`, {
      method: 'DELETE',
      version
    });
    counters.deletedEntries += 1;
  }

  const assets = await listAll('/assets');
  for (const asset of assets) {
    let version = asset.sys.version;

    if (asset.sys.publishedVersion) {
      const unpublished = await cma(`/assets/${asset.sys.id}/published`, {
        method: 'DELETE',
        version
      });
      version = unpublished?.sys?.version || version + 1;
    }

    await cma(`/assets/${asset.sys.id}`, {
      method: 'DELETE',
      version
    });
    counters.deletedAssets += 1;
  }
}

async function clearContentTypes() {
  const contentTypes = await listAll('/content_types');

  for (const ct of contentTypes) {
    let version = ct.sys.version;

    if (ct.sys.publishedVersion) {
      const unpublished = await cma(`/content_types/${ct.sys.id}/published`, {
        method: 'DELETE',
        version
      });
      version = unpublished?.sys?.version || version + 1;
    }

    await cma(`/content_types/${ct.sys.id}`, {
      method: 'DELETE',
      version
    });
    counters.deletedContentTypes += 1;
  }
}

async function createAndPublishModel() {
  for (const definition of MODEL_CONTENT_TYPES) {
    const created = await cma(`/content_types/${definition.id}`, {
      method: 'PUT',
      body: {
        name: definition.name,
        description: definition.description,
        displayField: definition.displayField,
        fields: definition.fields
      }
    });
    counters.createdContentTypes += 1;

    const published = await cma(`/content_types/${definition.id}/published`, {
      method: 'PUT',
      version: created.sys.version
    });
    contentTypeCache.set(definition.id, published);
    counters.publishedContentTypes += 1;
  }
}

function fieldMap(contentType) {
  /** @type {Map<string, any>} */
  const map = new Map();
  for (const field of contentType.fields || []) {
    map.set(field.id, field);
  }
  return map;
}

function assignIfPossible(fields, locale, fMap, fieldId, value) {
  const def = fMap.get(fieldId);
  if (!def) {
    return false;
  }

  const coerced = coerceFieldValue(def, value);
  if (coerced === undefined) {
    counters.skippedFields += 1;
    return false;
  }

  fields[fieldId] = { [locale]: coerced };
  return true;
}

async function getEntriesByContentType(contentTypeId) {
  const result = await cma(`/entries?content_type=${encodeURIComponent(contentTypeId)}&limit=1000`);
  return result.items || [];
}

async function upsertEntry({ contentTypeId, existingEntry, fields }) {
  if (existingEntry) {
    const updated = await cma(`/entries/${existingEntry.sys.id}`, {
      method: 'PUT',
      version: existingEntry.sys.version,
      body: {
        fields
      }
    });
    counters.updated += 1;

    await cma(`/entries/${updated.sys.id}/published`, {
      method: 'PUT',
      version: updated.sys.version
    });
    counters.published += 1;
    return;
  }

  const created = await cma('/entries', {
    method: 'POST',
    contentTypeId,
    body: {
      fields
    }
  });
  counters.created += 1;

  await cma(`/entries/${created.sys.id}/published`, {
    method: 'PUT',
    version: created.sys.version
  });
  counters.published += 1;
}

async function seedSiteSettings(content, locale) {
  const contentTypeId = 'siteSettings';
  const ct = await getContentType(contentTypeId);
  const fMap = fieldMap(ct);
  const existing = (await getEntriesByContentType(contentTypeId))[0] || null;

  const fields = {};
  assignIfPossible(fields, locale, fMap, 'organizationName', content.organizationName);
  assignIfPossible(fields, locale, fMap, 'siteName', content.organizationName);
  assignIfPossible(fields, locale, fMap, 'footerText', content.footerText);
  assignIfPossible(fields, locale, fMap, 'primaryCtaLabel', content.primaryCta?.label);
  assignIfPossible(fields, locale, fMap, 'ctaLabel', content.primaryCta?.label);
  assignIfPossible(fields, locale, fMap, 'primaryCtaUrl', content.primaryCta?.url);
  assignIfPossible(fields, locale, fMap, 'ctaUrl', content.primaryCta?.url);

  await upsertEntry({ contentTypeId, existingEntry: existing, fields });
}

async function seedHomePage(content, locale) {
  const contentTypeId = 'homePage';
  const ct = await getContentType(contentTypeId);
  const fMap = fieldMap(ct);
  const existing = (await getEntriesByContentType(contentTypeId))[0] || null;

  const fields = {};
  assignIfPossible(fields, locale, fMap, 'heroTitle', content.title);
  assignIfPossible(fields, locale, fMap, 'title', content.title);
  assignIfPossible(fields, locale, fMap, 'heroSubtitle', content.description);
  assignIfPossible(fields, locale, fMap, 'description', content.description);
  assignIfPossible(fields, locale, fMap, 'heroImageAlt', content.heroImageAlt);
  assignIfPossible(fields, locale, fMap, 'mission', content.mission);
  assignIfPossible(fields, locale, fMap, 'howItWorks', content.howItWorks);

  await upsertEntry({ contentTypeId, existingEntry: existing, fields });
}

async function seedStandardPages(pages, locale) {
  const contentTypeId = 'standardPage';
  const ct = await getContentType(contentTypeId);
  const fMap = fieldMap(ct);

  for (const page of pages) {
    const fields = {};
    assignIfPossible(fields, locale, fMap, 'slug', page.slug);
    assignIfPossible(fields, locale, fMap, 'title', page.title);
    assignIfPossible(fields, locale, fMap, 'intro', page.intro);

    const mergedBody = (page.sections || [])
      .map((section) => {
        const heading = section.heading ? `${section.heading}\n` : '';
        const body = section.bodyText || '';
        return `${heading}${body}`.trim();
      })
      .filter(Boolean)
      .join('\n\n');

    assignIfPossible(fields, locale, fMap, 'body', mergedBody);

    await upsertEntry({
      contentTypeId,
      existingEntry: null,
      fields
    });
  }
}

async function seedEvents(events, locale) {
  const contentTypeId = 'event';
  const ct = await getContentType(contentTypeId);
  const fMap = fieldMap(ct);

  for (const event of events) {
    const fields = {};
    assignIfPossible(fields, locale, fMap, 'slug', event.slug);
    assignIfPossible(fields, locale, fMap, 'title', event.title);
    assignIfPossible(fields, locale, fMap, 'startDate', event.startDate);
    assignIfPossible(fields, locale, fMap, 'endDate', event.endDate);
    assignIfPossible(fields, locale, fMap, 'location', event.location);
    assignIfPossible(fields, locale, fMap, 'summary', event.summary);
    assignIfPossible(fields, locale, fMap, 'details', event.details);
    assignIfPossible(fields, locale, fMap, 'registrationUrl', event.registrationUrl);
    assignIfPossible(fields, locale, fMap, 'registrationLink', event.registrationUrl);

    await upsertEntry({
      contentTypeId,
      existingEntry: null,
      fields
    });
  }
}

async function main() {
  const raw = await readFile(DATA_FILE, 'utf8');
  const data = JSON.parse(raw);
  const locale = await getDefaultLocale();

  await clearEntriesAndAssets();
  await clearContentTypes();
  await createAndPublishModel();

  await seedSiteSettings(data.siteSettings || {}, locale);
  await seedHomePage(data.homePage || {}, locale);
  await seedStandardPages(data.pages || [], locale);
  await seedEvents(data.events || [], locale);

  console.log('Seeding completed with full reset.');
  console.log(`Deleted entries: ${counters.deletedEntries}`);
  console.log(`Deleted assets: ${counters.deletedAssets}`);
  console.log(`Deleted content types: ${counters.deletedContentTypes}`);
  console.log(`Created content types: ${counters.createdContentTypes}`);
  console.log(`Published content types: ${counters.publishedContentTypes}`);
  console.log(`Created entries: ${counters.created}`);
  console.log(`Updated entries: ${counters.updated}`);
  console.log(`Published entries: ${counters.published}`);
  console.log(`Skipped field assignments: ${counters.skippedFields}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
