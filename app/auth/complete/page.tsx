'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthComplete() {
  const [status, setStatus] = useState('ログイン中...')
  const supabase = createClient()

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    if (!access_token || !refresh_token) {
      window.location.replace('/')
      return
    }

    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(async ({ error: setErr }) => {
        if (setErr) {
          setStatus('setSessionエラー: ' + setErr.message)
          return
        }
        const { data: { user }, error: getUserErr } = await supabase.auth.getUser()
        if (getUserErr || !user) {
          setStatus('getUserエラー: ' + (getUserErr?.message ?? 'userがnull'))
          return
        }
        setStatus('認証成功: ' + user.email + ' → 移動中...')
        setTimeout(() => window.location.replace('/contests'), 800)
      })
  }, [])

  return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-sm text-gray-500">{status}</p>
    </div>
  )
}
