import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

  const cookieStore = cookies()
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const joinery_type = searchParams.get('joinery_type')
  const fault = searchParams.get('fault')

  if (!joinery_type || !fault) {
    return NextResponse.json({ error: 'joinery_type and fault are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('repair_templates')
    .select('*')
    .eq('joinery_type', joinery_type)
    .eq('fault', fault)
    .maybeSingle()

  if (error) {
    console.error('repair-templates/match GET failed:', error.message)
    return NextResponse.json({ error: 'Failed to load template' }, { status: 500 })
  }

  return NextResponse.json(data)
}
