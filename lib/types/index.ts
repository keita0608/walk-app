export type UserRole = 'admin' | 'user';
export type EventType = 'individual' | 'team';
export type EventStatus = 'upcoming' | 'active' | 'finished';
export type Gender = 'male' | 'female';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  gender?: Gender;
}

export interface WalkEvent {
  id: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  type: EventType;
  status: EventStatus;
}

export interface EventParticipant {
  id: string;
  eventId: string;
  userId: string;
  teamId?: string;
  targetSteps?: number;
  handicapMultiplier?: number; // per-participant, default 1 (no handicap)
}

export interface Team {
  id: string;
  eventId: string;
  name: string;
}

export interface StepEntry {
  id: string;
  userId: string;
  eventId: string;
  date: string; // YYYY-MM-DD
  steps: number;
  submittedAt: Date;
  updatedAt?: Date;
}

export interface RankingEntry {
  userId: string;
  name: string;
  gender?: Gender;
  totalSteps: number;
  averageSteps: number;
  netAverageSteps: number;
  elapsedDays: number;
  submittedDays: number;
  hasMissingData: boolean;
  targetSteps?: number;
  handicapMultiplier: number;
  dailySteps: { date: string; steps: number; dow: number }[];
}
