import Link from 'next/link';
import { WalkEvent } from '@/lib/types';
import { displayDate } from '@/lib/utils/date';
import clsx from 'clsx';

interface Props {
  event: WalkEvent;
  isAdmin?: boolean;
}

const statusLabel: Record<WalkEvent['status'], string> = {
  upcoming: '開催前',
  active:   '開催中',
  finished: '終了',
};

const statusClass: Record<WalkEvent['status'], string> = {
  upcoming: 'bg-yellow-100 text-yellow-700',
  active:   'bg-green-100 text-green-700',
  finished: 'bg-gray-100 text-gray-500',
};

export default function EventCard({ event, isAdmin = false }: Props) {
  const isFinished = event.status === 'finished';

  return (
    <div
      className={clsx(
        'rounded-xl border p-4 flex flex-col gap-3',
        isFinished ? 'bg-gray-50 border-gray-200' : 'bg-white border-indigo-100 shadow-sm',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className={clsx('font-semibold text-base', isFinished ? 'text-gray-400' : 'text-gray-800')}>
          {event.title}
        </h3>
        <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', statusClass[event.status])}>
          {statusLabel[event.status]}
        </span>
      </div>

      <div className="text-xs text-gray-500">
        {displayDate(event.startDate)} 〜 {displayDate(event.endDate)}
        <span className="ml-2 text-gray-400">
          ({event.type === 'individual' ? '個人戦' : 'チーム戦'})
        </span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {isAdmin ? (
          <Link
            href={`/admin/events/${event.id}`}
            className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            管理画面
          </Link>
        ) : (
          <>
            {event.status === 'active' && (
              <Link
                href={`/events/${event.id}/steps`}
                className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                歩数を入力
              </Link>
            )}
            <Link
              href={`/events/${event.id}/ranking`}
              className={clsx(
                'text-sm px-3 py-1.5 rounded-lg border',
                isFinished
                  ? 'border-gray-300 text-gray-500 hover:bg-gray-100'
                  : 'border-indigo-300 text-indigo-600 hover:bg-indigo-50',
              )}
            >
              {event.status === 'finished' ? '結果を見る' : '進捗を見る'}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
