import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function DELETE(request, { params }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const cookieStore = cookies()
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // RLS enforces business scoping — only the owner's templates are visible
  const { error } = await supabase
    .from('repair_templates')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('repair-templates DELETE failed:', error.message)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
