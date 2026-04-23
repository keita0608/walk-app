import { RankingEntry, StepEntry, AppUser, EventParticipant } from '@/lib/types';
import { getElapsedDays, getDateRange } from './date';

export function formatSteps(steps: number): string {
  return steps.toLocaleString('en-US');
}

export function computeRankings(
  participants: AppUser[],
  participantData: EventParticipant[],
  steps: StepEntry[],
  startDate: string,
  endDate?: string,
): RankingEntry[] {
  const elapsedDays = getElapsedDays(startDate);
  const dateRange = getDateRange(startDate, endDate);
  const participantMap = Object.fromEntries(participantData.map((p) => [p.userId, p]));

  return participants.map((user) => {
    const pData = participantMap[user.id];
    const handicapMultiplier = pData?.handicapMultiplier ?? 1;
    const targetSteps = pData?.targetSteps;

    const userSteps = steps.filter((s) => s.userId === user.id);
    const submittedDates = new Set(userSteps.map((s) => s.date));
    const totalSteps = userSteps.reduce((sum, s) => sum + s.steps, 0);
    const averageSteps = elapsedDays > 0 ? Math.floor(totalSteps / elapsedDays) : 0;
    const netAverageSteps = Math.floor(averageSteps * handicapMultiplier);
    const hasMissingData = dateRange.some((d) => !submittedDates.has(d));

    // Daily steps ordered by date, each tagged with day-of-week index (0=Sun..6=Sat)
    const dailySteps = [...userSteps]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => {
        const [y, m, d] = s.date.split('-').map(Number);
        const dow = new Date(y, m - 1, d).getDay();
        return { date: s.date, steps: s.steps, dow };
      });

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
      targetSteps,
      handicapMultiplier,
      dailySteps,
    };
  });
}
