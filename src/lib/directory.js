import generated from '../data/content.generated.json';

/**
 * Directory listings from Contentful (`directoryMember`), written at build time into
 * `content.generated.json` by `scripts/fetch-contentful.mjs`. Sorted by first name, then last name.
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
  const list = Array.isArray(generated.directoryMembers) ? [...generated.directoryMembers] : [];
  list.sort((a, b) => {
    const byFirst = a.firstName.localeCompare(b.firstName, undefined, { sensitivity: 'base' });
    if (byFirst !== 0) {
      return byFirst;
    }
    return a.lastName.localeCompare(b.lastName, undefined, { sensitivity: 'base' });
  });
  return list;
}
