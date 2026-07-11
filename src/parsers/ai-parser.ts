import { GoogleGenAI, Schema, Type } from '@google/genai';
import { config } from '../config';
import { ActivityData } from '../utils/scoring';

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    github: {
      type: Type.OBJECT,
      properties: {
        commits: { type: Type.INTEGER },
        prs: { type: Type.INTEGER },
        reviews: { type: Type.INTEGER }
      },
      required: ['commits', 'prs', 'reviews']
    },
    x: {
      type: Type.OBJECT,
      properties: {
        tweets: { type: Type.INTEGER },
        replies: { type: Type.INTEGER },
        likes: { type: Type.INTEGER }
      },
      required: ['tweets', 'replies', 'likes']
    },
    linkedin: {
      type: Type.OBJECT,
      properties: {
        posts: { type: Type.INTEGER },
        comments: { type: Type.INTEGER }
      },
      required: ['posts', 'comments']
    }
  },
  required: ['github', 'x', 'linkedin']
};

export async function parseRawActivity(rawGithub: any, rawX: any, rawLinkedIn: any): Promise<ActivityData> {
  // We use Gemini Flash for fast, cheap structural parsing of messy HTML/text from scrapers.
  const prompt = `
  Analyze the following raw scraped data from a user's social/developer profiles for TODAY.
  Return a structured JSON object counting their activity.
  
  GitHub Data: ${JSON.stringify(rawGithub)}
  X Data: ${JSON.stringify(rawX)}
  LinkedIn Data: ${JSON.stringify(rawLinkedIn)}
  
  Count the number of tweets authored by the user today (ignore retweets).
  Count the number of LinkedIn posts today.
  Count the number of GitHub commits today.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      }
    });

    const text = response.text;
    if (!text) throw new Error('Empty response from Gemini');
    
    return JSON.parse(text) as ActivityData;
  } catch (error) {
    console.error('Error parsing raw activity:', error);
    // Return zeros if parsing fails, better than crashing the pipeline
    return {
      github: { commits: rawGithub?.commits || 0, prs: rawGithub?.prs || 0, reviews: rawGithub?.reviews || 0 },
      x: { tweets: 0, replies: 0, likes: 0 },
      linkedin: { posts: 0, comments: 0 }
    };
  }
}
