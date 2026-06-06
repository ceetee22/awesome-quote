import { createServiceClient } from '@/lib/supabase-service'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const ADMIN_USER_ID = process.env.ADMIN_USER_ID

export async function POST(request) {
  if (!ADMIN_USER_ID) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 503 })
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== ADMIN_USER_ID) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { business_id, active } = await request.json()
  if (!business_id || typeof active !== 'boolean') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const service = createServiceClient()
  if (!service) return NextResponse.json({ error: 'Service role key not configured' }, { status: 503 })

  const { error } = await service
    .from('businesses')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('id', business_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
