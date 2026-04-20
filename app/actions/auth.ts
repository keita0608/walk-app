'use server'

import { createClient } from '@/lib/supabase/server'

export async function verifyOtpAction(
  email: string,
  token: string
): Promise<{ error: string } | void> {
  const supabase = createClient()

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })

  if (error) {
    return { error: error.message }
  }
}
