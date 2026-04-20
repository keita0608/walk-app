import { redirect, notFound } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import ContestForm from '../../ContestForm'

export default async function EditContestPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const service = createServiceClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')
  if (user.email !== process.env.ADMIN_EMAIL) redirect('/contests')

  const { data: contest } = await service
    .from('contests')
    .select('id, title, start_date, end_date')
    .eq('id', params.id)
    .single()
  if (!contest) notFound()

  const { data: participantRows } = await service
    .from('contest_participants')
    .select('user_id')
    .eq('contest_id', params.id)

  const { data: profiles } = await service
    .from('profiles')
    .select('id, username')
    .order('username')

  const currentParticipantIds = (participantRows ?? []).map((p) => p.user_id)

  return (
    <div className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
      <div className="mb-6">
        <a
          href="/admin"
          className="text-xs text-gray-400 hover:text-gray-600 mb-1 flex items-center gap-1"
        >
          ← 管理者パネル
        </a>
        <h2 className="text-xl font-bold text-gray-900">コンテスト編集</h2>
      </div>
      <ContestForm
        mode="edit"
        contestId={params.id}
        defaultValues={{
          title: contest.title,
          start_date: contest.start_date,
          end_date: contest.end_date,
          participantIds: currentParticipantIds,
        }}
        allUsers={profiles ?? []}
      />
    </div>
  )
}
