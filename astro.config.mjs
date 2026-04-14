import { defineConfig } from 'astro/config';

function githubPagesConfig() {
  const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
  const repository = process.env.GITHUB_REPOSITORY || '';

  if (!isGitHubActions || !repository.includes('/')) {
    return {
      site: 'https://natureconnectedprofessionals.org',
      base: '/'
    };
  }

  const [owner, repo] = repository.split('/');
  const isUserSiteRepo = repo.toLowerCase() === `${owner.toLowerCase()}.github.io`;
  const site = `https://${owner}.github.io`;

  return {
    site,
    base: isUserSiteRepo ? '/' : `/${repo}/`
  };
}

export default defineConfig(githubPagesConfig());
