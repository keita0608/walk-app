import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldPath, Timestamp } from 'firebase-admin/firestore';
import { getYesterdayJST } from '@/lib/utils/date';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, steps, date } = body as { token?: string; steps?: number; date?: string };

    if (!token || typeof steps !== 'number' || steps <= 0 || steps >= 100000) {
      return NextResponse.json({ error: 'invalid input' }, { status: 400 });
    }

    // Look up user by apiToken
    const usersSnap = await adminDb
      .collection('users')
      .where('apiToken', '==', token)
      .limit(1)
      .get();

    if (usersSnap.empty) {
      return NextResponse.json({ error: 'invalid token' }, { status: 401 });
    }

    const userId = usersSnap.docs[0].id;

    // Find participations for this user
    const participationsSnap = await adminDb
      .collection('eventParticipants')
      .where('userId', '==', userId)
      .get();

    if (participationsSnap.empty) {
      return NextResponse.json({ error: 'no event participation found' }, { status: 404 });
    }

    const eventIds = Array.from(new Set(participationsSnap.docs.map((d) => d.data().eventId as string)));

    // Find an active event among the participant's events (Firestore 'in' limit = 30)
    let activeEventId: string | null = null;
    for (let i = 0; i < eventIds.length; i += 30) {
      const batch = eventIds.slice(i, i + 30);
      const eventsSnap = await adminDb
        .collection('events')
        .where(FieldPath.documentId(), 'in', batch)
        .where('status', '==', 'active')
        .limit(1)
        .get();
      if (!eventsSnap.empty) {
        activeEventId = eventsSnap.docs[0].id;
        break;
      }
    }

    if (!activeEventId) {
      return NextResponse.json({ error: 'no active event' }, { status: 404 });
    }

    const stepDate = date ?? getYesterdayJST();
    const stepId = `${userId}_${activeEventId}_${stepDate}`;

    await adminDb.collection('steps').doc(stepId).set(
      { userId, eventId: activeEventId, date: stepDate, steps, updatedAt: Timestamp.now() },
      { merge: true },
    );

    return NextResponse.json({ success: true, date: stepDate, steps });
  } catch (err) {
    console.error('[POST /api/steps]', err);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
