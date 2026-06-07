import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

function makeClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  const cookieStore = cookies()
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  })
}

export async function GET() {
  const supabase = makeClient()
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('repair_templates')
    .select('*')
    .order('joinery_type')
    .order('fault')

  if (error) {
    console.error('repair-templates GET failed:', error.message)
    return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

export async function POST(request) {
  const supabase = makeClient()
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { joinery_type, fault, price, parts, is_custom, custom_name } = body || {}
  if (!joinery_type || !fault) {
    return NextResponse.json({ error: 'joinery_type and fault are required' }, { status: 400 })
  }

  const { data: biz } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!biz) return NextResponse.json({ error: 'No business found' }, { status: 400 })

  const { data, error } = await supabase
    .from('repair_templates')
    .upsert(
      {
        business_id: biz.id,
        joinery_type,
        fault,
        price: price != null ? parseFloat(price) : null,
        is_custom: is_custom ?? false,
        custom_name: custom_name ?? null,
        parts: parts ?? [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'business_id,joinery_type,fault' }
    )
    .select()
    .single()

  if (error) {
    console.error('repair-templates POST failed:', error.message)
    return NextResponse.json({ error: 'Failed to save template' }, { status: 500 })
  }

  return NextResponse.json(data)
}
