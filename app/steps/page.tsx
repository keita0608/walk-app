'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import StepForm from '@/components/StepForm';
import { getStep } from '@/lib/firebase/firestore';
import { getYesterdayJST } from '@/lib/utils/date';

export default function StepsPage() {
  const { user } = useAuth();
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getStep(user.id, getYesterdayJST())
      .then((s) => setAlreadySubmitted(!!s))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <AuthGuard>
      <div className="space-y-5">
        <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-800">
          ← ホームに戻る
        </Link>

        <h1 className="text-xl font-bold text-gray-800">歩数を入力</h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : (
          <StepForm
            alreadySubmitted={alreadySubmitted}
            onSubmitted={() => setAlreadySubmitted(true)}
          />
        )}

        <Link
          href="/journey"
          className="block text-center text-sm text-indigo-600 hover:text-indigo-800 py-2"
        >
          どこまでいける？ →
        </Link>
      </div>
    </AuthGuard>
  );
}
