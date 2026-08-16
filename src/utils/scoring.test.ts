import { describe, it, expect } from 'vitest';
import { scoreActivity, calculateReward } from './scoring';

describe('scoring utils', () => {
  describe('scoreActivity', () => {
    it('should correctly calculate the score from activity data', () => {
      const data = {
        github: { commits: 2, prs: 1, reviews: 0 }, // 2*3 + 1*5 + 0 = 11
        x: { tweets: 1, replies: 2, likes: 4 }, // 1*2 + 2*1 + 4*0.5 = 6
        linkedin: { posts: 1, comments: 2 }, // 1*3 + 2*1 = 5
      };

      const score = scoreActivity(data);
      expect(score).toBe(22); // 11 + 6 + 5 = 22
    });

    it('should handle missing data gracefully (zeros)', () => {
      const data = {
        github: { commits: 0, prs: 0, reviews: 0 },
        x: { tweets: 0, replies: 0, likes: 0 },
        linkedin: { posts: 0, comments: 0 },
      };

      const score = scoreActivity(data);
      expect(score).toBe(0);
    });
  });

  describe('calculateReward', () => {
    it('should return 1.0 when score improves', () => {
      expect(calculateReward(10, 20)).toBe(1.0);
    });

    it('should return 0.3 when score is the same', () => {
      expect(calculateReward(15, 15)).toBe(0.3);
    });

    it('should return 0.0 when score regresses', () => {
      expect(calculateReward(20, 10)).toBe(0.0);
    });
  });
});
