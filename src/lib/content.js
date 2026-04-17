import generated from '../data/content.generated.json';
import { NAV_LINKS } from './navLinks.js';

/** @typedef {{label: string, href: string}} NavLink */
/** @typedef {{label: string, url: string}} PrimaryCta */
/** @typedef {{organizationName: string, footerText: string, primaryCta: PrimaryCta, navLinks: NavLink[]}} SiteSettings */
/** @typedef {{title: string, description: string, heroImageUrl: string, heroImageAlt: string, mission: string, howItWorks: string[], highlightCards: {title: string, description: string}[]}} HomeContent */
/** @typedef {{heading: string, bodyText?: string, cards?: {title: string, description: string}[], listItems?: string[]}} PageSection */
/** @typedef {{title: string, description: string, href?: string}} InfoCard */
/** @typedef {{slug: string, title: string, intro: string, sections: PageSection[], infoCards?: InfoCard[], heroImageUrl?: string, heroImageAlt?: string}} PageContent */
/** @typedef {{title: string, startDate: string, endDate: string, season?: string, year?: string, location: string, summary: string, details: string, specialInfo?: string, registrationUrl?: string, image?: string}} EventItem */

const RESERVED_DYNAMIC_SLUGS = new Set(['gatherings', 'join', 'directory']);

const PRIMARY_CTA = {
  label: 'Join the community',
  url: '/connect'
};

function isValidDate(value) {
  if (!value) {
    return false;
  }
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

/** True if the event has any valid start date. */
function hasStartDate(event) {
  return isValidDate(event.startDate);
}

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

/** Best-effort sort timestamp for an event:
 *  1. Real `startDate` when present.
 *  2. Mid-season of `year` when season+year are known (e.g. Summer 2026 → Jul 15 2026).
 *  3. Mid-year (Jul 1) of `year` when only `year` is known.
 *  4. `null` when no temporal signal exists at all.
 */
function eventSortMs(event) {
  if (hasStartDate(event)) {
    return new Date(event.startDate).getTime();
  }
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

function sortByDateAsc(a, b) {
  return compareBySortMs(a, b, 'asc');
}

function sortByDateDesc(a, b) {
  return compareBySortMs(a, b, 'desc');
}

/** Best-effort end timestamp for "is this past yet?" checks:
 *  - explicit `endDate` when set;
 *  - `startDate` when that's all we have;
 *  - end-of-season (~3 months after season start) for season+year events;
 *  - end-of-year for year-only events;
 *  - `+Infinity` (never past) for events with no temporal signal at all. */
function eventEndMs(event) {
  if (event.endDate && isValidDate(event.endDate)) {
    return new Date(event.endDate).getTime();
  }
  if (hasStartDate(event)) {
    return new Date(event.startDate).getTime();
  }
  const yearNum = parseInt(String(event.year || '').trim(), 10);
  if (!Number.isFinite(yearNum)) {
    return Number.POSITIVE_INFINITY;
  }
  const seasonMonth = seasonToMonth(event.season);
  if (seasonMonth != null) {
    return new Date(yearNum, seasonMonth + 3, 1).getTime();
  }
  return new Date(yearNum + 1, 0, 1).getTime();
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
  return (generated.events || []).filter((event) => event.title);
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

/**
 * Human-readable label for when an event happens.
 * Prefers actual start/end datetimes; falls back to `Season Year`
 * (e.g. "Summer 2026") and finally a "date to be determined" message.
 *
 * @param {EventItem} event
 * @param {{dateStyle?: 'short' | 'long'}} [options]
 * @returns {string}
 */
export function formatEventWhen(event, options = {}) {
  const { dateStyle = 'long' } = options;

  if (hasStartDate(event)) {
    const start = new Date(event.startDate);
    const end = event.endDate && isValidDate(event.endDate) ? new Date(event.endDate) : null;

    if (dateStyle === 'short') {
      return start.toLocaleDateString();
    }

    const startLabel = start.toLocaleString();
    return end ? `${startLabel} to ${end.toLocaleString()}` : startLabel;
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
