export interface ActivityData {
  github: {
    commits: number;
    prs: number;
    reviews: number;
  };
  x: {
    tweets: number;
    replies: number;
    likes: number;
  };
  linkedin: {
    posts: number;
    comments: number;
  };
}

/**
 * Calculates a weighted score for the user's daily activity.
 */
export function scoreActivity(data: ActivityData): number {
  let score = 0;
  
  score += (data.github?.commits || 0) * 3;
  score += (data.github?.prs || 0) * 5;
  score += (data.github?.reviews || 0) * 2;
  
  score += (data.x?.tweets || 0) * 2;
  score += (data.x?.replies || 0) * 1;
  score += (data.x?.likes || 0) * 0.5;
  
  score += (data.linkedin?.posts || 0) * 3;
  score += (data.linkedin?.comments || 0) * 1;
  
  return score;
}

/**
 * Calculates a reward value based on the change in activity score.
 * 1.0 = Improvement
 * 0.3 = No change
 * 0.0 = Regression
 */
export function calculateReward(prevScore: number, nextScore: number): number {
  if (nextScore > prevScore) return 1.0;
  if (nextScore === prevScore) return 0.3;
  return 0.0;
}
