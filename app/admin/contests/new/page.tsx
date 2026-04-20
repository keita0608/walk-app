import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import ContestForm from '../ContestForm'

export default async function NewContestPage() {
  const supabase = createClient()
  const service = createServiceClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')
  if (user.email !== process.env.ADMIN_EMAIL) redirect('/contests')

  const { data: profiles } = await service
    .from('profiles')
    .select('id, username')
    .order('username')

  return (
    <div className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
      <div className="mb-6">
        <a
          href="/admin"
          className="text-xs text-gray-400 hover:text-gray-600 mb-1 flex items-center gap-1"
        >
          ← 管理者パネル
        </a>
        <h2 className="text-xl font-bold text-gray-900">コンテスト作成</h2>
      </div>
      <ContestForm
        mode="create"
        allUsers={profiles ?? []}
      />
    </div>
  )
}
