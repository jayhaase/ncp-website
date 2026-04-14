import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

loadDotEnv(path.join(projectRoot, '.env'));

const spaceId = process.env.CONTENTFUL_SPACE_ID;
const managementToken = process.env.CONTENTFUL_MANAGEMENT_TOKEN;
const environment = process.env.CONTENTFUL_ENVIRONMENT || 'master';

if (!spaceId || !managementToken) {
  console.error('Missing required env vars: CONTENTFUL_SPACE_ID and CONTENTFUL_MANAGEMENT_TOKEN');
  process.exit(1);
}

const API_BASE = `https://api.contentful.com/spaces/${spaceId}/environments/${environment}`;

const counters = {
  created: 0,
  updated: 0,
  published: 0
};

const CONTENT_TYPES = [
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

async function cma(pathName, { method = 'GET', body, version } = {}) {
  const headers = {
    Authorization: `Bearer ${managementToken}`
  };

  if (body) {
    headers['Content-Type'] = 'application/vnd.contentful.management.v1+json';
  }

  if (version !== undefined && version !== null) {
    headers['X-Contentful-Version'] = String(version);
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

  return response.json();
}

async function getContentType(id) {
  try {
    return await cma(`/content_types/${id}`);
  } catch (error) {
    if ((error.message || '').includes(' 404 ')) {
      return null;
    }
    throw error;
  }
}

async function upsertContentType(definition) {
  const existing = await getContentType(definition.id);
  const body = {
    name: definition.name,
    description: definition.description,
    displayField: definition.displayField,
    fields: definition.fields
  };

  if (!existing) {
    const created = await cma(`/content_types/${definition.id}`, {
      method: 'PUT',
      body
    });
    counters.created += 1;
    return created;
  }

  const updated = await cma(`/content_types/${definition.id}`, {
    method: 'PUT',
    version: existing.sys.version,
    body
  });
  counters.updated += 1;
  return updated;
}

async function publishContentType(contentType) {
  const published = await cma(`/content_types/${contentType.sys.id}/published`, {
    method: 'PUT',
    version: contentType.sys.version
  });
  counters.published += 1;
  return published;
}

async function main() {
  for (const definition of CONTENT_TYPES) {
    const upserted = await upsertContentType(definition);
    await publishContentType(upserted);
  }

  console.log('Content model bootstrap completed.');
  console.log(`Created content types: ${counters.created}`);
  console.log(`Updated content types: ${counters.updated}`);
  console.log(`Published content types: ${counters.published}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
