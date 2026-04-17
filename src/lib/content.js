import generated from '../data/content.generated.json';
import { NAV_LINKS } from './navLinks.js';

/** @typedef {{label: string, href: string}} NavLink */
/** @typedef {{label: string, url: string}} PrimaryCta */
/** @typedef {{organizationName: string, footerText: string, primaryCta: PrimaryCta, navLinks: NavLink[]}} SiteSettings */
/** @typedef {{title: string, description: string, heroImageUrl: string, heroImageAlt: string, mission: string, howItWorks: string[], highlightCards: {title: string, description: string}[]}} HomeContent */
/** @typedef {{heading: string, bodyText?: string, cards?: {title: string, description: string}[], listItems?: string[]}} PageSection */
/** @typedef {{title: string, description: string, href?: string}} InfoCard */
/** @typedef {{slug: string, title: string, intro: string, sections: PageSection[], infoCards?: InfoCard[], heroImageUrl?: string, heroImageAlt?: string}} PageContent */
/** @typedef {{title: string, startDate: string, endDate: string, location: string, summary: string, details: string, specialInfo?: string, registrationUrl?: string, image?: string}} EventItem */

const RESERVED_DYNAMIC_SLUGS = new Set(['gatherings', 'join', 'directory']);

const PRIMARY_CTA = {
  label: 'Join the community',
  url: '/connect'
};

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

/** End of event in ms (`endDate` when set, otherwise `startDate`). */
function eventEndMs(event) {
  if (event.endDate && isValidDate(event.endDate)) {
    return new Date(event.endDate).getTime();
  }
  return new Date(event.startDate).getTime();
}

function isEventPast(event, nowMs) {
  return eventEndMs(event) < nowMs;
}

/** @returns {SiteSettings} */
export function getSiteSettings() {
  return {
    ...generated.siteSettings,
    primaryCta: PRIMARY_CTA,
    navLinks: NAV_LINKS.filter((item) => item?.href !== '/join')
  };
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
    .filter((event) => !isEventPast(event, now))
    .sort(sortByDateAsc);
}

/** @returns {EventItem[]} */
export function getPastEvents() {
  const now = Date.now();
  return getAllEvents()
    .filter((event) => isEventPast(event, now))
    .sort(sortByDateDesc);
}
