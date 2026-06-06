import { createServiceClient } from '@/lib/supabase-service'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const ADMIN_USER_ID = process.env.ADMIN_USER_ID

export async function GET() {
  if (!ADMIN_USER_ID) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 503 })
  }

  // Verify the caller is the admin via their session
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

  const service = createServiceClient()
  if (!service) return NextResponse.json({ error: 'Service role key not configured' }, { status: 503 })

  const { data: businesses } = await service
    .from('businesses')
    .select('id, name, owner_id, setup_complete, active, onboarding_complete, created_at')
    .order('created_at', { ascending: false })

  if (!businesses) return NextResponse.json({ businesses: [], summary: {} })

  // Fetch all jobs once and aggregate per business
  const { data: jobRows } = await service
    .from('jobs')
    .select('business_id, status, updated_at')

  const jobsByBusiness = {}
  const QUOTED_STATUSES = new Set(['quoted', 'accepted', 'ordered', 'scheduled', 'completed', 'invoiced', 'declined'])
  ;(jobRows || []).forEach((j) => {
    const b = jobsByBusiness[j.business_id] || { total: 0, quoted: 0, last_activity: null }
    b.total++
    if (QUOTED_STATUSES.has(j.status)) b.quoted++
    if (!b.last_activity || j.updated_at > b.last_activity) b.last_activity = j.updated_at
    jobsByBusiness[j.business_id] = b
  })

  // Fetch auth user metadata for each owner via service role admin API
  const usersData = {}
  const ownerIds = [...new Set(businesses.map((b) => b.owner_id).filter(Boolean))]
  await Promise.all(
    ownerIds.map(async (uid) => {
      const { data: { user: u } } = await service.auth.admin.getUserById(uid)
      if (u) {
        usersData[uid] = {
          email: u.email || '',
          full_name: u.user_metadata?.full_name || '',
          last_sign_in_at: u.last_sign_in_at || null,
        }
      }
    })
  )

  const result = businesses.map((b) => ({
    ...b,
    owner_email: usersData[b.owner_id]?.email || '',
    owner_name: usersData[b.owner_id]?.full_name || '',
    owner_last_sign_in: usersData[b.owner_id]?.last_sign_in_at || null,
    job_count: jobsByBusiness[b.id]?.total || 0,
    quotes_sent: jobsByBusiness[b.id]?.quoted || 0,
    last_activity: jobsByBusiness[b.id]?.last_activity || null,
  }))

  const summary = {
    total_users: businesses.length,
    active_users: businesses.filter((b) => b.active !== false).length,
    total_jobs: (jobRows || []).length,
    total_quotes: (jobRows || []).filter((j) => QUOTED_STATUSES.has(j.status)).length,
  }

  return NextResponse.json({ businesses: result, summary })
}
