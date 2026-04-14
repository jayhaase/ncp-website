import generated from '../data/content.generated.json';

/** @typedef {{label: string, href: string}} NavLink */
/** @typedef {{label: string, url: string}} PrimaryCta */
/** @typedef {{organizationName: string, footerText: string, primaryCta: PrimaryCta, navLinks: NavLink[]}} SiteSettings */
/** @typedef {{title: string, description: string, mission: string, howItWorks: string[], highlightCards: {title: string, description: string}[], featuredEventSlugs: string[], connectIntro: string, joinCtaText: string}} HomeContent */
/** @typedef {{heading: string, bodyText?: string, cards?: {title: string, description: string}[], listItems?: string[]}} PageSection */
/** @typedef {{slug: string, title: string, intro: string, sections: PageSection[]}} PageContent */
/** @typedef {{slug: string, title: string, startDate: string, endDate: string, location: string, summary: string, details: string, status: 'upcoming' | 'past', registrationUrl?: string}} EventItem */
/** @typedef {{label: string, description: string, url: string, category: string, visibilityNote?: string}} CommunityLink */

const RESERVED_DYNAMIC_SLUGS = new Set(['gatherings']);

function isValidDate(value) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function sortByDateAsc(a, b) {
  return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
}

function sortByDateDesc(a, b) {
  return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
}

/** @returns {SiteSettings} */
export function getSiteSettings() {
  return generated.siteSettings;
}

/** @returns {HomeContent} */
export function getHomeContent() {
  return generated.homePage;
}

/** @returns {PageContent[]} */
export function getAllPages() {
  return generated.pages || [];
}

/** @returns {PageContent[]} */
export function getRoutableStandardPages() {
  return getAllPages().filter((page) => !RESERVED_DYNAMIC_SLUGS.has(page.slug));
}

/** @param {string} slug */
/** @returns {PageContent | null} */
export function getPageBySlug(slug) {
  return getAllPages().find((page) => page.slug === slug) || null;
}

/** @returns {EventItem[]} */
export function getAllEvents() {
  return (generated.events || []).filter((event) => event.title && isValidDate(event.startDate));
}

/** @returns {EventItem[]} */
export function getUpcomingEvents() {
  const now = Date.now();
  return getAllEvents()
    .filter((event) => {
      const isPastFlag = event.status === 'past';
      const isBeforeNow = new Date(event.startDate).getTime() < now;
      return !isPastFlag && !isBeforeNow;
    })
    .sort(sortByDateAsc);
}

/** @returns {EventItem[]} */
export function getPastEvents() {
  const now = Date.now();
  return getAllEvents()
    .filter((event) => {
      const isPastFlag = event.status === 'past';
      const isBeforeNow = new Date(event.startDate).getTime() < now;
      return isPastFlag || isBeforeNow;
    })
    .sort(sortByDateDesc);
}

/** @returns {CommunityLink[]} */
export function getCommunityLinks() {
  return generated.communityLinks || [];
}

/** @returns {EventItem[]} */
export function getFeaturedEvents() {
  const slugs = new Set(getHomeContent().featuredEventSlugs || []);
  if (!slugs.size) {
    return getUpcomingEvents().slice(0, 3);
  }

  return getAllEvents().filter((event) => slugs.has(event.slug));
}
