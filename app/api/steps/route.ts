import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { getYesterdayJST } from '@/lib/utils/date';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, steps, date } = body as { token?: string; steps?: number; date?: string };

    if (!token || typeof steps !== 'number' || steps <= 0 || steps >= 100000) {
      return NextResponse.json({ error: 'invalid input' }, { status: 400 });
    }

    // Look up user by apiToken
    const usersSnap = await getAdminDb()
      .collection('users')
      .where('apiToken', '==', token)
      .limit(1)
      .get();

    if (usersSnap.empty) {
      return NextResponse.json({ error: 'invalid token' }, { status: 401 });
    }

    const userId = usersSnap.docs[0].id;
    const stepDate = date ?? getYesterdayJST();
    const stepId = `${userId}_${stepDate}`;

    await getAdminDb().collection('steps').doc(stepId).set(
      { userId, date: stepDate, steps, updatedAt: Timestamp.now() },
      { merge: true },
    );

    return NextResponse.json({ success: true, date: stepDate, steps });
  } catch (err) {
    console.error('[POST /api/steps]', err);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
