import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'email' | 'magiclink' | null
  const next = searchParams.get('next') ?? '/contests'

  if (token_hash && type) {
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth_failed`)
}
