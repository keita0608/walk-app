import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  where,
  documentId,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { AppUser, WalkEvent, EventParticipant, Team, StepEntry } from '@/lib/types';

type ParticipantUpdate = Partial<Pick<EventParticipant, 'targetSteps' | 'handicapMultiplier'>>;

// ─── Config ──────────────────────────────────────────────────────────────────

export async function getMaintenanceMode(): Promise<boolean> {
  const snap = await getDoc(doc(db, 'config', 'maintenance'));
  if (!snap.exists()) return false;
  return snap.data().enabled === true;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function getUser(userId: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as AppUser;
}

export async function getUsers(): Promise<AppUser[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppUser));
}

export async function createUser(userId: string, data: Omit<AppUser, 'id'>): Promise<void> {
  await setDoc(doc(db, 'users', userId), data);
}

export async function updateUser(userId: string, data: Partial<Omit<AppUser, 'id'>>): Promise<void> {
  await updateDoc(doc(db, 'users', userId), data);
}

export async function saveApiToken(userId: string, token: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { apiToken: token });
}

export async function recordJourneyCompletion(userId: string, routeId: string): Promise<void> {
  const userSnap = await getDoc(doc(db, 'users', userId));
  const current = (userSnap.data()?.journeyCompletions as Record<string, number>) ?? {};
  await updateDoc(doc(db, 'users', userId), {
    journeyCompletions: { ...current, [routeId]: (current[routeId] ?? 0) + 1 },
  });
}

export async function setJourneyRoute(
  userId: string,
  routeId: string | null,
  startDate?: string,
): Promise<void> {
  if (routeId === null) {
    await updateDoc(doc(db, 'users', userId), {
      journeyRouteId: deleteField(),
      journeyRouteStartDate: deleteField(),
    });
  } else {
    await updateDoc(doc(db, 'users', userId), {
      journeyRouteId: routeId,
      journeyRouteStartDate: startDate ?? deleteField(),
    });
  }
}

export async function deleteUserRecord(userId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId));
}

// ─── Events ──────────────────────────────────────────────────────────────────

export async function getEvents(): Promise<WalkEvent[]> {
  const snap = await getDocs(collection(db, 'events'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as WalkEvent));
}

export async function getEvent(eventId: string): Promise<WalkEvent | null> {
  const snap = await getDoc(doc(db, 'events', eventId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as WalkEvent;
}

export async function createEvent(data: Omit<WalkEvent, 'id'>): Promise<string> {
  const ref = doc(collection(db, 'events'));
  await setDoc(ref, data);
  return ref.id;
}

export async function updateEvent(
  eventId: string,
  data: Partial<Omit<WalkEvent, 'id'>>,
): Promise<void> {
  await updateDoc(doc(db, 'events', eventId), data);
}

// Deletes an event and all its participants and teams (steps are user-level and not deleted).
export async function deleteEvent(eventId: string): Promise<void> {
  const deleteDocs = async (col: string, field: string) => {
    const q = query(collection(db, col), where(field, '==', eventId));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  };
  await Promise.all([
    deleteDoc(doc(db, 'events', eventId)),
    deleteDocs('eventParticipants', 'eventId'),
    deleteDocs('teams', 'eventId'),
  ]);
}

// ─── Event Participants ───────────────────────────────────────────────────────

export async function getEventParticipants(eventId: string): Promise<EventParticipant[]> {
  const q = query(collection(db, 'eventParticipants'), where('eventId', '==', eventId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventParticipant));
}

export async function getUserParticipations(userId: string): Promise<EventParticipant[]> {
  const q = query(collection(db, 'eventParticipants'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventParticipant));
}

export async function addParticipants(
  eventId: string,
  userIds: string[],
  teamAssignments?: Record<string, string>,
): Promise<void> {
  await Promise.all(
    userIds.map((userId) => {
      const ref = doc(collection(db, 'eventParticipants'));
      return setDoc(ref, {
        eventId,
        userId,
        teamId: teamAssignments?.[userId] ?? null,
      });
    }),
  );
}

export async function removeParticipant(participantId: string): Promise<void> {
  await deleteDoc(doc(db, 'eventParticipants', participantId));
}

export async function updateParticipant(
  participantId: string,
  data: ParticipantUpdate,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if ('targetSteps' in data) {
    payload.targetSteps = data.targetSteps !== undefined ? data.targetSteps : deleteField();
  }
  if ('handicapMultiplier' in data) {
    payload.handicapMultiplier = data.handicapMultiplier !== undefined ? data.handicapMultiplier : deleteField();
  }
  await updateDoc(doc(db, 'eventParticipants', participantId), payload);
}

// ─── Teams ───────────────────────────────────────────────────────────────────

export async function getTeams(eventId: string): Promise<Team[]> {
  const q = query(collection(db, 'teams'), where('eventId', '==', eventId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Team));
}

export async function createTeams(eventId: string, names: string[]): Promise<Team[]> {
  const teams: Team[] = [];
  await Promise.all(
    names.map(async (name) => {
      const ref = doc(collection(db, 'teams'));
      await setDoc(ref, { eventId, name });
      teams.push({ id: ref.id, eventId, name });
    }),
  );
  return teams;
}

// ─── Steps ───────────────────────────────────────────────────────────────────

function toStepEntry(id: string, data: Record<string, unknown>): StepEntry {
  return {
    id,
    userId:      data.userId as string,
    date:        data.date as string,
    steps:       data.steps as number,
    submittedAt: (data.submittedAt as Timestamp)?.toDate?.() ?? new Date(),
    updatedAt:   (data.updatedAt as Timestamp)?.toDate?.(),
  };
}

export async function getStepsByUser(userId: string): Promise<StepEntry[]> {
  const q = query(collection(db, 'steps'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toStepEntry(d.id, d.data()));
}

export async function getStepsByDateRange(startDate: string, endDate: string): Promise<StepEntry[]> {
  const q = query(
    collection(db, 'steps'),
    where('date', '>=', startDate),
    where('date', '<=', endDate),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toStepEntry(d.id, d.data()));
}

export async function getStep(userId: string, date: string): Promise<StepEntry | null> {
  const stepId = `${userId}_${date}`;
  const snap = await getDoc(doc(db, 'steps', stepId));
  if (!snap.exists()) return null;
  return toStepEntry(snap.id, snap.data());
}

export async function submitStep(userId: string, date: string, steps: number): Promise<void> {
  const stepId = `${userId}_${date}`;
  const ref = doc(db, 'steps', stepId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { steps, updatedAt: Timestamp.now() });
  } else {
    await setDoc(ref, { userId, date, steps, submittedAt: Timestamp.now() });
  }
}

export async function adminUpdateStep(userId: string, date: string, steps: number): Promise<void> {
  const stepId = `${userId}_${date}`;
  await setDoc(
    doc(db, 'steps', stepId),
    { userId, date, steps, updatedAt: Timestamp.now() },
    { merge: true },
  );
}

// Fetch events by IDs (for user event list)
export async function getEventsByIds(eventIds: string[]): Promise<WalkEvent[]> {
  if (eventIds.length === 0) return [];
  const events: WalkEvent[] = [];
  // Firestore 'in' query limit = 30
  for (let i = 0; i < eventIds.length; i += 30) {
    const batch = eventIds.slice(i, i + 30);
    const q = query(collection(db, 'events'), where(documentId(), 'in', batch));
    const snap = await getDocs(q);
    events.push(...snap.docs.map((d) => ({ id: d.id, ...d.data() } as WalkEvent)));
  }
  return events;
}
