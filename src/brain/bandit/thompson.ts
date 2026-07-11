import { db } from '../../db';
import { STRATEGIES } from './strategies';

export interface BanditArm {
  armName: string;
  alpha: number;
  beta: number;
  totalPulls: number;
  totalRewards: number;
}

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// ─── Pure Math: Beta Distribution Sampling ───────────────────────────────────

export function sampleBeta(alpha: number, beta: number): number {
  const x = gammaVariate(alpha);
  const y = gammaVariate(beta);
  return x / (x + y);
}

function gammaVariate(shape: number): number {
  if (shape < 1) {
    return gammaVariate(shape + 1) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x: number, v: number;
    do {
      x = randn();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function randn(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ─── Strategy Selection (Contextual Bandit) ──────────────────────────────────

/**
 * Selects the best strategy arm using Thompson Sampling with day-of-week context blending.
 * Day-specific performance is blended 40% with global performance so the bandit
 * learns both per-day patterns and overall user preferences simultaneously.
 */
export async function selectStrategy(userId: string) {
  const arms = await db.strategyArm.findMany({ where: { userId } });

  if (arms.length === 0) {
    await initializeArms(userId);
    return selectStrategy(userId);
  }

  const todayDow = DAYS[new Date().getDay()];
  const samples: Record<string, number> = {};
  let bestArm = arms[0].armName;
  let bestSample = -1;

  for (const arm of arms) {
    // Global Thompson sample
    const globalSample = sampleBeta(arm.alpha, arm.beta);

    // Day-of-week contextual blend (if day-specific data exists)
    const dayPerf = arm.dayPerformance as Record<string, { alpha: number; beta: number }> | null;
    let blendedSample = globalSample;
    if (dayPerf && dayPerf[todayDow]) {
      const daySample = sampleBeta(dayPerf[todayDow].alpha, dayPerf[todayDow].beta);
      // 60% global, 40% day-specific
      blendedSample = 0.6 * globalSample + 0.4 * daySample;
    }

    samples[arm.armName] = blendedSample;
    if (blendedSample > bestSample) {
      bestSample = blendedSample;
      bestArm = arm.armName;
    }
  }

  return { selectedArm: bestArm, samples };
}

export async function updateReward(userId: string, armName: string, reward: number) {
  const arm = await db.strategyArm.findUnique({ where: { userId_armName: { userId, armName } } });
  if (!arm) return;

  const success = reward > 0.5;
  const todayDow = DAYS[new Date().getDay()];

  const dayPerf = (arm.dayPerformance as Record<string, { alpha: number; beta: number }> | null) ?? {};
  const current = dayPerf[todayDow] ?? { alpha: 1, beta: 1 };

  await db.strategyArm.update({
    where: { id: arm.id },
    data: {
      alpha: { increment: success ? 1 : 0 },
      beta: { increment: success ? 0 : 1 },
      totalPulls: { increment: 1 },
      totalRewards: { increment: reward },
      dayPerformance: {
        ...dayPerf,
        [todayDow]: {
          alpha: current.alpha + (success ? 1 : 0),
          beta: current.beta + (success ? 0 : 1)
        }
      }
    }
  });
}

export async function initializeArms(userId: string) {
  const data = STRATEGIES.map(s => ({
    userId,
    armName: s.armName,
    alpha: 1,
    beta: 1
  }));

  await db.strategyArm.createMany({
    data,
    skipDuplicates: true
  });
}
