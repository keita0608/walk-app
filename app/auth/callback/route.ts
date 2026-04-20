import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'email' | 'magiclink' | null
  const next = searchParams.get('next') ?? '/contests'

  if (token_hash && type) {
    const cookieStore = cookies()
    const pendingCookies: { name: string; value: string; options: CookieOptions }[] = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(c: { name: string; value: string; options: CookieOptions }[]) { pendingCookies.push(...c) },
        },
      }
    )

    const { error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`)
      pendingCookies.forEach(({ name, value, options }) =>
        response.cookies.set(name, value, options)
      )
      return response
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth_failed`)
}

export async function POST(request: Request) {
  const { origin } = new URL(request.url)
  const formData = await request.formData()
  const email = formData.get('email') as string
  const token = formData.get('token') as string

  if (!email || !token) {
    return NextResponse.redirect(`${origin}/`, { status: 303 })
  }

  const cookieStore = cookies()
  const pendingCookies: { name: string; value: string; options: CookieOptions }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(c: { name: string; value: string; options: CookieOptions }[]) { pendingCookies.push(...c) },
      },
    }
  )

  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })

  if (error) {
    const url = new URL('/', origin)
    url.searchParams.set('error', error.message)
    url.searchParams.set('email', email)
    return NextResponse.redirect(url.toString(), { status: 303 })
  }

  const response = NextResponse.redirect(`${origin}/contests`, { status: 303 })
  pendingCookies.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options)
  )
  return response
}
