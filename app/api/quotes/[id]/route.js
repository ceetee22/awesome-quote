import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Status values that represent a quote that can be shown to the customer
const VISIBLE_STATUSES = ['quoted', 'accepted', 'ordered', 'scheduled', 'completed', 'invoiced']

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// GET /api/quotes/[id] — public endpoint used by the acceptance page
export async function GET(request, { params }) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  const { id } = params

  const [jobResult, settingsResult] = await Promise.all([
    supabase
      .from('jobs')
      .select('*, job_items(*, job_item_parts(*))')
      .eq('id', id)
      .single(),
    supabase
      .from('settings')
      .select('business_name, gst_rate, logo_url, trading_name')
      .eq('id', 1)
      .single(),
  ])

  const job = jobResult.data

  if (!job) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!VISIBLE_STATUSES.includes(job.status)) {
    return NextResponse.json({ error: 'Quote not available' }, { status: 404 })
  }

  const settings = settingsResult.data || {}

  return NextResponse.json({
    id: job.id,
    status: job.status,
    customer_name: job.customer_name,
    customer_address: job.customer_address,
    customer_phone: job.customer_phone,
    callout_fee: Number(job.callout_fee) || 0,
    hourly_rate: Number(job.hourly_rate) || 85,
    labour_hours: Number(job.labour_hours) || 0,
    created_at: job.created_at,
    business_name: settings.business_name || 'Awesome Building Services',
    trading_name: settings.trading_name || '',
    logo_url: settings.logo_url || '',
    gst_rate: Number(settings.gst_rate) || 15,
    parking_note_shown: job.parking_note_shown ?? true,
    items: (job.job_items || []).map((item) => ({
      id: item.id,
      type: item.type,
      joinery_type: item.joinery_type,
      joinery_type_label: item.joinery_type_label,
      fault: item.fault,
      fault_label: item.fault_label,
      description: item.description,
      labour_hours: Number(item.labour_hours) || 0,
      photos: (item.photos || []).filter((p) => p.type === 'before'),
      parts: (item.job_item_parts || []).map((p) => ({
        id: p.id,
        name: p.name,
        sell_price: Number(p.sell_price) || 0,
        qty: Number(p.qty) || 1,
        unit: p.unit,
      })),
    })),
  })
}

// PATCH /api/quotes/[id] — customer accepts the quote
export async function PATCH(request, { params }) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  const { id } = params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (body.action !== 'accept') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  const { data: job } = await supabase
    .from('jobs')
    .select('status')
    .eq('id', id)
    .single()

  if (!job) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Idempotent: if already accepted, return ok
  if (job.status !== 'quoted') {
    return NextResponse.json({ ok: true, status: job.status })
  }

  await supabase
    .from('jobs')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({ ok: true, status: 'accepted' })
}
