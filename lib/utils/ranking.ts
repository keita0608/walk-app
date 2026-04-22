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
): RankingEntry[] {
  const elapsedDays = getElapsedDays(startDate);
  const dateRange = getDateRange(startDate, endDate);

  const entries: RankingEntry[] = participants.map((user) => {
    const userSteps = steps.filter((s) => s.userId === user.id);
    const submittedDates = new Set(userSteps.map((s) => s.date));
    const totalSteps = userSteps.reduce((sum, s) => sum + s.steps, 0);
    const averageSteps = elapsedDays > 0 ? Math.floor(totalSteps / elapsedDays) : 0;
    const hasMissingData = dateRange.some((d) => !submittedDates.has(d));

    return {
      userId: user.id,
      name: user.name,
      totalSteps,
      averageSteps,
      elapsedDays,
      submittedDays: userSteps.length,
      hasMissingData,
    };
  });

  return entries.sort((a, b) => b.averageSteps - a.averageSteps);
}
