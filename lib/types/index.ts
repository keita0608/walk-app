export type UserRole = 'admin' | 'user';
export type EventType = 'individual' | 'team';
export type EventStatus = 'upcoming' | 'active' | 'finished';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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
  totalSteps: number;
  averageSteps: number;
  elapsedDays: number;
  submittedDays: number;
  hasMissingData: boolean;
}
