import { PipelineAgent } from './types';
import { PipelineState } from '../state';
import { fetchGitHubActivity } from '../../collectors/github';
import { scrapeXProfile } from '../../collectors/x-scraper';
import { scrapeLinkedInProfile } from '../../collectors/linkedin-scraper';
import { decrypt } from '../../utils/crypto';

export const researcherAgent: PipelineAgent = {
  stage: 'collect',
  nextStage: 'parse',
  async execute(state: PipelineState, user: any): Promise<PipelineState> {
    console.log(`[Pipeline] Stage 1: Collecting data for ${user.name || user.id}`);

    const creds = user.credentials;
    const ghToken = creds?.githubPat ?? null;
    const xToken = creds?.xAuthToken ? decrypt(creds.xAuthToken) : null;
    const liToken = creds?.linkedInLiAt ? decrypt(creds.linkedInLiAt) : null;

    const [ghData, xData, liData] = await Promise.all([
      creds?.githubUsername ? fetchGitHubActivity(creds.githubUsername, ghToken) : Promise.resolve(null),
      xToken ? scrapeXProfile(creds?.githubUsername || '', xToken) : Promise.resolve(null),
      liToken ? scrapeLinkedInProfile('https://linkedin.com/in/' + creds?.githubUsername, liToken) : Promise.resolve(null)
    ]);

    state.rawGithub = ghData;
    state.rawX = xData;
    state.rawLinkedIn = liData;

    return state;
  }
};
