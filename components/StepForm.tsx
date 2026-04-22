'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { submitStep } from '@/lib/firebase/firestore';
import { getYesterdayJST, isSubmissionAllowed, displayDate } from '@/lib/utils/date';

interface Props {
  eventId: string;
  alreadySubmitted: boolean;
  onSubmitted: () => void;
}

export default function StepForm({ eventId, alreadySubmitted, onSubmitted }: Props) {
  const { user } = useAuth();
  const [steps, setSteps] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const yesterday = getYesterdayJST();
  const allowed = isSubmissionAllowed();
  const disabled = alreadySubmitted || !allowed;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');

    const val = parseInt(steps, 10);
    if (isNaN(val) || val <= 0 || val >= 100000) {
      setError('1〜99999の整数を入力してください');
      return;
    }

    if (!isSubmissionAllowed()) {
      setError('10:00 JST を過ぎているため提出できません');
      return;
    }

    setSubmitting(true);
    try {
      await submitStep(user.id, eventId, yesterday, val);
      onSubmitted();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError('提出に失敗しました: ' + msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h2 className="font-semibold text-gray-800 mb-1">歩数を提出</h2>
      <p className="text-sm text-gray-500 mb-4">対象日：{displayDate(yesterday)}</p>

      {!allowed && !alreadySubmitted && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          10:00 JST を過ぎたため、本日の提出は締め切られました。
        </div>
      )}

      {alreadySubmitted && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          ✅ 本日分は提出済みです。
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            昨日の歩数
          </label>
          <input
            type="number"
            min={1}
            max={99999}
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            disabled={disabled}
            placeholder="例：8000"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={disabled || submitting}
          className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? '送信中…' : '提出する'}
        </button>
      </form>
    </div>
  );
}
