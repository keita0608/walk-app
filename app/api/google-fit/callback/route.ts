import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { exchangeCodeForTokens } from '@/lib/google-fit'

function createService() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state') // user ID
  const error = searchParams.get('error')

  const setupUrl = new URL('/setup', request.nextUrl.origin)

  if (error || !code || !state) {
    setupUrl.searchParams.set('error', error ?? 'cancelled')
    return NextResponse.redirect(setupUrl)
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    const service = createService()
    await service.from('google_fit_tokens').upsert(
      {
        user_id: state,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: 'user_id' }
    )

    setupUrl.searchParams.set('google', 'success')
    return NextResponse.redirect(setupUrl)
  } catch {
    setupUrl.searchParams.set('error', 'token_exchange_failed')
    return NextResponse.redirect(setupUrl)
  }
}
