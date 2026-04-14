import generated from '../data/content.generated.json';

/**
 * Directory listings from Contentful (`directoryMember`), written at build time into
 * `content.generated.json` by `scripts/fetch-contentful.mjs`.
 *
 * @returns {Array<{
 *   email: string,
 *   firstName: string,
 *   lastName: string,
 *   organization: string,
 *   website: string | null,
 *   pronouns: string,
 *   services: string,
 *   certifications: string,
 *   displayName: string,
 *   photoUrl: string | null
 * }>}
 */
export function getDirectoryEntries() {
  const list = generated.directoryMembers;
  return Array.isArray(list) ? list : [];
}
