import { RankingEntry, StepEntry, AppUser } from '@/lib/types';
import { getElapsedDays, getDateRange } from './date';

export function formatSteps(steps: number): string {
  return steps.toLocaleString('en-US');
}

export function computeRankings(
  participants: AppUser[],
  steps: StepEntry[],
  startDate: string,
  endDate?: string,
  handicapMultiplier: number = 1,
): RankingEntry[] {
  const elapsedDays = getElapsedDays(startDate);
  const dateRange = getDateRange(startDate, endDate);

  return participants.map((user) => {
    const userSteps = steps.filter((s) => s.userId === user.id);
    const submittedDates = new Set(userSteps.map((s) => s.date));
    const totalSteps = userSteps.reduce((sum, s) => sum + s.steps, 0);
    const averageSteps = elapsedDays > 0 ? Math.floor(totalSteps / elapsedDays) : 0;
    const multiplier = user.gender === 'female' ? handicapMultiplier : 1;
    const netAverageSteps = Math.floor(averageSteps * multiplier);
    const hasMissingData = dateRange.some((d) => !submittedDates.has(d));

    return {
      userId: user.id,
      name: user.name,
      gender: user.gender,
      totalSteps,
      averageSteps,
      netAverageSteps,
      elapsedDays,
      submittedDays: userSteps.length,
      hasMissingData,
      targetSteps: user.targetSteps,
    };
  });
}
