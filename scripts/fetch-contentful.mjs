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
    },
    navLinks: [
      { label: 'Home', href: '/' },
      { label: 'About', href: '/about' },
      { label: 'Gatherings', href: '/gatherings' },
      { label: 'Connect', href: '/connect' }
    ]
  },
  homePage: {
    title: 'Gathering people who help others connect with nature.',
    description: '',
    mission:
      'We gather to cultivate depth through community building, engage broadly through networking, and steward care for life by generously sharing skills, knowledge, and lived experience.',
    howItWorks: [
      'Seasonal gatherings convene members around practical themes and facilitated connection.',
      'Unconference-style sessions create room for peer learning, collaboration, and emergent topics.',
      'Members contribute resources, referrals, and lessons learned from real-world practice.'
    ],
    highlightCards: [
      {
        title: 'For practitioners and educators',
        description: 'A professional community for people weaving nature connection into their work.'
      },
      {
        title: 'Rooted in practice',
        description: 'Tools, stories, and methods are shared in plain language and grounded in experience.'
      },
      {
        title: 'Participation first',
        description: 'Join events, contribute ideas, and help shape the direction of the community.'
      }
    ],
    featuredEventSlugs: ['spring-networking-walk'],
    connectIntro:
      'Build relationships through the online community, shared events, and introductions to peers in related fields.',
    joinCtaText:
      'Ready to take part? Start with the Connect page to see the simplest path into gatherings, directory access, and community spaces.'
  },
  pages: [
    {
      slug: 'about',
      title: 'About Nature Connected Professionals',
      intro:
        'Nature Connected Professionals is a member-powered network supporting people who use nature connection in counseling, education, health, and community practice.',
      sections: [
        {
          heading: 'Lorem ipsum',
          bodyText:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus posuere velit aliquet.'
        },
        {
          heading: 'Dolor sit amet',
          bodyText:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas faucibus mollis interdum, sed posuere consectetur est at lobortis.'
        }
      ]
    },
    {
      slug: 'connect',
      title: 'Connect With Others',
      intro:
        'Find clear pathways to connect with members, conversations, and collaboration opportunities across the community.',
      sections: [
        {
          heading: 'Member directory',
          bodyText:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus posuere velit aliquet.'
        },
        {
          heading: 'Online community',
          bodyText:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas faucibus mollis interdum, sed posuere consectetur est at lobortis.'
        }
      ]
    },
    
  ],
  events: [
    {
      slug: 'spring-networking-walk',
      title: 'Spring Networking Walk',
      startDate: '2026-05-16T10:00:00-05:00',
      endDate: '2026-05-16T12:00:00-05:00',
      location: 'Woodlake Nature Center, Richfield, MN',
      summary: 'A seasonal gathering to reconnect, share current work, and build new professional relationships.',
      details:
        'Participants will move through guided introductions, small-group exchange, and a closing reflection focused on practical collaboration opportunities.',
      status: 'upcoming',
      registrationUrl: '',
      imageUrl: '/images/placeholders/gathering-circle.svg'
    },
    {
      slug: 'summer-field-practice-circle',
      title: 'Summer Field Practice Circle',
      startDate: '2026-07-13T17:30:00-05:00',
      endDate: '2026-07-13T19:30:00-05:00',
      location: 'Theodore Wirth Regional Park, Minneapolis, MN',
      summary: 'A practical evening focused on peer exchange, reflection, and in-the-field facilitation techniques.',
      details:
        'Participants will explore guided prompts, partner dialogue, and shared skill-building around nature-based professional practice.',
      status: 'upcoming',
      registrationUrl: '',
      imageUrl: '/images/placeholders/hero-nature.svg'
    },
    {
      slug: 'winter-solstice-gathering-2022',
      title: 'Winter Solstice Gathering',
      startDate: '2022-12-21T18:00:00-06:00',
      endDate: '2022-12-21T21:00:00-06:00',
      location: 'Spiritwoods, Stillwater, MN',
      summary: 'A community evening focused on connection during the longest night.',
      details: 'Included shared practice, reflection, and facilitated group activities.',
      status: 'past',
      registrationUrl: '',
      imageUrl: '/images/placeholders/hero-nature.svg'
    }
  ],
  communityLinks: [
    {
      label: 'Request directory access',
      description: 'Directory participation is managed off-site and shared with approved members.',
      url: '/connect',
      category: 'directory',
      visibilityNote: 'Private/off-site access pathway'
    },
    {
      label: 'Join the online community',
      description: 'Connect with peers between gatherings for support and collaboration.',
      url: '/connect',
      category: 'slack',
      visibilityNote: 'Access details shared after join request'
    }
  ]
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

function mapNavLinks(siteItem, linkMap) {
  const field = siteItem?.fields?.navLinks;
  const linked = resolveLinkedEntries(field, linkMap);

  const fromLinked = linked
    .map((item) => ({
      label: item.fields?.label || item.fields?.title,
      href: item.fields?.href || item.fields?.url
    }))
    .filter((item) => item.label && item.href);

  if (fromLinked.length) {
    return fromLinked;
  }

  const fromInline = toArray(field)
    .map((item) => ({
      label: item?.fields?.label || item?.label,
      href: item?.fields?.href || item?.href || item?.url
    }))
    .filter((item) => item.label && item.href);

  return fromInline.length ? fromInline : FALLBACK_CONTENT.siteSettings.navLinks;
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

function mapSiteSettings(siteResponse) {
  const siteItem = siteResponse?.items?.[0];
  if (!siteItem) {
    return FALLBACK_CONTENT.siteSettings;
  }

  const linkMap = getLinkedEntryMap(siteResponse);
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
    },
    navLinks: mapNavLinks(siteItem, linkMap)
  };
}

function mapHomePage(homeResponse) {
  const homeItem = homeResponse?.items?.[0];
  if (!homeItem) {
    return FALLBACK_CONTENT.homePage;
  }

  const linkMap = getLinkedEntryMap(homeResponse);
  const featuredEvents = resolveLinkedEntries(
    homeItem.fields?.featuredEvents || homeItem.fields?.eventHighlights,
    linkMap
  );

  return {
    title: homeItem.fields?.heroTitle || homeItem.fields?.title || FALLBACK_CONTENT.homePage.title,
    description:
      toPlainText(homeItem.fields?.heroSubtitle || homeItem.fields?.description) ||
      FALLBACK_CONTENT.homePage.description,
    mission: toPlainText(homeItem.fields?.mission) || FALLBACK_CONTENT.homePage.mission,
    howItWorks: toArray(homeItem.fields?.howItWorks)
      .map((item) => toPlainText(item))
      .filter(Boolean),
    highlightCards: mapHighlightCards(homeItem, linkMap),
    featuredEventSlugs: featuredEvents
      .map((entry) => entry.fields?.slug)
      .filter(Boolean),
    connectIntro: toPlainText(homeItem.fields?.connectIntro) || FALLBACK_CONTENT.homePage.connectIntro,
    joinCtaText: toPlainText(homeItem.fields?.joinCtaText) || FALLBACK_CONTENT.homePage.joinCtaText
  };
}

function mapPages(pageResponse) {
  const linkMap = getLinkedEntryMap(pageResponse);
  const pages = toArray(pageResponse?.items)
    .map((item) => ({
      slug: item.fields?.slug,
      title: item.fields?.title,
      intro: toPlainText(item.fields?.intro || item.fields?.description),
      sections: mapSectionBlocks(item, linkMap)
    }))
    .filter((page) => page.slug && page.title);

  return pages.length ? pages : FALLBACK_CONTENT.pages;
}

function mapEvents(eventResponse) {
  const assetMap = getLinkedAssetMap(eventResponse);
  const events = toArray(eventResponse?.items)
    .map((item) => ({
      slug: item.fields?.slug || item.sys?.id,
      title: item.fields?.title,
      startDate: item.fields?.startDate || item.fields?.start || '',
      endDate: item.fields?.endDate || item.fields?.end || '',
      location: toPlainText(item.fields?.location),
      summary: toPlainText(item.fields?.summary),
      details: toPlainText(item.fields?.details),
      status: item.fields?.status || 'upcoming',
      registrationUrl: item.fields?.registrationUrl || item.fields?.registrationLink || '',
      imageUrl: extractAssetUrl(
        item.fields?.image ||
          item.fields?.featuredImage ||
          item.fields?.eventImage ||
          item.fields?.photo,
        assetMap
      )
    }))
    .filter((event) => event.title && event.startDate);

  return events.length ? events : FALLBACK_CONTENT.events;
}

function mapCommunityLinks(communityResponse) {
  const links = toArray(communityResponse?.items)
    .map((item) => ({
      label: item.fields?.label || item.fields?.title,
      description: toPlainText(item.fields?.description),
      url: item.fields?.url,
      category: item.fields?.category || 'resources',
      visibilityNote: toPlainText(item.fields?.visibilityNote)
    }))
    .filter((item) => item.label && item.url);

  return links.length ? links : FALLBACK_CONTENT.communityLinks;
}

function normalizeContent(siteResponse, homeResponse, pageResponse, eventResponse, communityResponse) {
  const siteSettings = mapSiteSettings(siteResponse);
  const homePage = mapHomePage(homeResponse);

  return {
    siteSettings,
    homePage: {
      ...FALLBACK_CONTENT.homePage,
      ...homePage,
      howItWorks: homePage.howItWorks.length ? homePage.howItWorks : FALLBACK_CONTENT.homePage.howItWorks
    },
    pages: mapPages(pageResponse),
    events: mapEvents(eventResponse),
    communityLinks: mapCommunityLinks(communityResponse)
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

  if (!client) {
    const changed = await writeGenerated(FALLBACK_CONTENT);
    console.log(
      changed
        ? 'Contentful credentials missing. Wrote fallback content.'
        : 'Contentful credentials missing. Fallback content unchanged.'
    );
    return;
  }

  try {
    const [siteResponse, homeResponse, pageResponse, eventResponse, communityResponse] = await Promise.all([
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
        content_type: 'communityLink',
        limit: '300'
      })
    ]);

    const content = normalizeContent(siteResponse, homeResponse, pageResponse, eventResponse, communityResponse);
    const changed = await writeGenerated(content);
    console.log(
      changed
        ? 'Content sync complete. Updated src/data/content.generated.json'
        : 'Content sync complete. No content changes detected.'
    );
  } catch (error) {
    const changed = await writeGenerated(FALLBACK_CONTENT);
    console.log(
      changed
        ? `Contentful sync failed, wrote fallback content instead: ${error.message}`
        : `Contentful sync failed, fallback content unchanged: ${error.message}`
    );
  }
}

run();
