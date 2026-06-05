import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// GET /api/done/[id] — public endpoint for the completion/before-after page
// Returns no pricing, no internal notes — photos only.
export async function GET(request, { params }) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  const { id } = params

  const [jobResult, settingsResult] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, customer_name, status, after_photos, job_items(id, type, description, joinery_type_label, fault_label, photos)')
      .eq('id', id)
      .single(),
    supabase
      .from('settings')
      .select('business_name, trading_name, business_phone, business_email, logo_url')
      .eq('id', 1)
      .single(),
  ])

  const job = jobResult.data
  if (!job) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const settings = settingsResult.data || {}

  return NextResponse.json({
    customer_name: job.customer_name,
    business_name: settings.business_name || '',
    trading_name: settings.trading_name || '',
    logo_url: settings.logo_url || null,
    business_phone: settings.business_phone || '',
    business_email: settings.business_email || '',
    legacy_after_photos: job.after_photos || [],
    items: (job.job_items || []).map((item) => ({
      id: item.id,
      label: item.type === 'diagnosed'
        ? [item.joinery_type_label, item.fault_label].filter(Boolean).join(' - ')
        : (item.description || 'Custom item'),
      before_photos: (item.photos || []).filter((p) => p.type === 'before'),
      after_photos: (item.photos || []).filter((p) => p.type === 'after'),
    })).filter((item) => item.before_photos.length > 0 || item.after_photos.length > 0),
  })
}
