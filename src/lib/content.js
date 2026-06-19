import generated from '../data/content.generated.json';
import { NAV_LINKS } from './navLinks.js';

/** @typedef {{label: string, href: string}} NavLink */
/** @typedef {{label: string, url: string}} PrimaryCta */
/** @typedef {{organizationName: string, footerText: string, primaryCta: PrimaryCta, navLinks: NavLink[]}} SiteSettings */
/** @typedef {{title: string, description: string, url?: string, ctaLabel?: string}} NewsletterContent */
/** @typedef {{title: string, description: string, heroImageUrl: string, heroImageAlt: string, mission: string, howItWorks: string[], highlightCards: {title: string, description: string}[], newsletter?: NewsletterContent}} HomeContent */
/** @typedef {{heading: string, bodyText?: string, cards?: {title: string, description: string}[], listItems?: string[]}} PageSection */
/** @typedef {{title: string, description: string, href?: string}} InfoCard */
/** @typedef {{slug: string, title: string, intro: string, sections: PageSection[], infoCards?: InfoCard[], heroImageUrl?: string, heroImageAlt?: string}} PageContent */
/** @typedef {{title: string, whenText?: string, season?: string, year?: string, location: string, summary: string, details: string, specialInfo?: string, registrationUrl?: string, image?: string}} EventItem */

const RESERVED_DYNAMIC_SLUGS = new Set(['gatherings', 'join', 'directory', 'connect']);

/** Canonical month index (0–11) for a season label, or null if unrecognized.
 *  Chosen to match this community's seasonal gathering rhythm
 *  (Spring → late Apr/early May, Summer → July, Fall → Sept/Oct, Winter → January). */
function seasonToMonth(season) {
  const s = String(season || '').trim().toLowerCase();
  if (!s) return null;
  if (s.startsWith('spring')) return 3; // April
  if (s.startsWith('summer')) return 6; // July
  if (s.startsWith('fall') || s.startsWith('autumn')) return 9; // October
  if (s.startsWith('winter')) return 0; // January
  return null;
}

function eventSortMs(event) {
  const yearNum = parseInt(String(event.year || '').trim(), 10);
  if (!Number.isFinite(yearNum)) {
    return null;
  }
  const seasonMonth = seasonToMonth(event.season);
  if (seasonMonth != null) {
    return new Date(yearNum, seasonMonth, 15).getTime();
  }
  return new Date(yearNum, 6, 1).getTime();
}

function currentSeasonAnchorMs(now = new Date()) {
  const month = now.getMonth();
  let seasonMonth = 0;

  if (month >= 2 && month <= 4) {
    seasonMonth = 3; // Spring
  } else if (month >= 5 && month <= 7) {
    seasonMonth = 6; // Summer
  } else if (month >= 8 && month <= 10) {
    seasonMonth = 9; // Fall
  }

  return new Date(now.getFullYear(), seasonMonth, 15).getTime();
}

/** Compare by derived timestamp. Events with no temporal signal at all
 *  always sort to the end regardless of direction. */
function compareBySortMs(a, b, direction) {
  const am = eventSortMs(a);
  const bm = eventSortMs(b);
  if (am == null && bm == null) return 0;
  if (am == null) return 1;
  if (bm == null) return -1;
  return direction === 'desc' ? bm - am : am - bm;
}

/** @returns {SiteSettings} */
export function getSiteSettings() {
  return {
    ...generated.siteSettings,
    navLinks: NAV_LINKS
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
  return (generated.events || []).filter((event) => event.title);
}

/** @returns {EventItem[]} */
export function getUpcomingEvents() {
  const currentAnchor = currentSeasonAnchorMs();

  return getAllEvents()
    .filter((event) => {
      const sortMs = eventSortMs(event);
      return sortMs == null || sortMs >= currentAnchor;
    })
    .sort((a, b) => compareBySortMs(a, b, 'asc'));
}

/**
 * Human-readable label for when an event happens.
 * Prefers explicit freeform display text, then falls back to `Season Year`
 * (e.g. "Summer 2026") and finally a "date to be determined" message.
 *
 * @param {EventItem} event
 * @returns {string}
 */
export function formatEventWhen(event) {
  const explicit = String(event.whenText || '').trim();
  if (explicit) {
    return explicit;
  }

  const season = (event.season || '').trim();
  const year = (event.year || '').toString().trim();
  if (season && year) {
    return `${season} ${year}`;
  }
  if (season) {
    return season;
  }
  if (year) {
    return year;
  }
  return 'Date to be determined';
}
