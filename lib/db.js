import { supabase } from './supabase'
import { MOCK_PARTS } from './mock-data'
import { DEFAULT_CALLOUT_ZONES } from './constants'

// ─── Parts ───────────────────────────────────────────────────────────────────

export async function getParts() {
  if (!supabase) return [...MOCK_PARTS]
  const { data } = await supabase
    .from('parts')
    .select('*')
    .eq('active', true)
    .order('name')
  return data || []
}

export async function getPartsCount() {
  if (!supabase) return MOCK_PARTS.filter((p) => p.active).length
  const { count } = await supabase
    .from('parts')
    .select('*', { count: 'exact', head: true })
    .eq('active', true)
  return count || 0
}

export async function getRepairTemplatesCount() {
  if (!supabase) return 0
  const { count } = await supabase
    .from('repair_templates')
    .select('*', { count: 'exact', head: true })
  return count || 0
}

// ─── Job rooms ────────────────────────────────────────────────────────────────

export async function getJobRooms(jobId) {
  if (!supabase) return []
  const { data } = await supabase.from('job_rooms').select('*').eq('job_id', jobId).order('created_at')
  return data || []
}

export async function createJobRoom(jobId, name) {
  if (!supabase) return null
  const { data: existing } = await supabase
    .from('job_rooms').select('*').eq('job_id', jobId).eq('name', name).maybeSingle()
  if (existing) return existing
  const { data } = await supabase
    .from('job_rooms').insert({ job_id: jobId, name }).select().single()
  return data
}

// ─── Template usage ───────────────────────────────────────────────────────────

export async function trackTemplateUsage(templateId) {
  if (!supabase || !templateId) return
  const { data } = await supabase
    .from('repair_templates').select('times_used').eq('id', templateId).maybeSingle()
  await supabase.from('repair_templates').update({
    times_used: ((data?.times_used) || 0) + 1,
    last_used_at: new Date().toISOString(),
  }).eq('id', templateId)
}

export async function getPartsByFitsAndFixes(joineryType, fault) {
  if (!supabase) {
    return MOCK_PARTS.filter(
      (p) =>
        p.active &&
        p.fits.includes(joineryType) &&
        p.fixes.includes(fault)
    )
  }
  if (!joineryType || !fault || fault === 'other') return []
  const { data } = await supabase
    .from('parts')
    .select('*')
    .eq('active', true)
    .contains('fits', [joineryType])
    .contains('fixes', [fault])
  return data || []
}

export async function createPart(part) {
  if (!supabase) return
  await supabase.from('parts').insert(part)
}

export async function updatePart(id, updates) {
  if (!supabase) return
  await supabase.from('parts').update(updates).eq('id', id)
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

function transformJob(row) {
  const roomMap = Object.fromEntries((row.job_rooms || []).map((r) => [r.id, r]))
  return {
    ...row,
    rooms: row.job_rooms || [],
    items: (row.job_items || []).map((item) => ({
      ...item,
      parts: item.job_item_parts || [],
      room_name: item.room_id ? (roomMap[item.room_id]?.name || null) : null,
    })),
  }
}

export async function getJobs() {
  if (!supabase) return []
  const { data } = await supabase
    .from('jobs')
    .select('*, job_items(*, job_item_parts(*)), job_rooms(*)')
    .order('created_at', { ascending: false })
  return (data || []).map(transformJob)
}

export async function dbCreateJob(job) {
  if (!supabase) return
  const { items, ...fields } = job
  await supabase.from('jobs').insert(fields)
}

export async function dbUpdateJob(id, updates) {
  if (!supabase) return
  // Strip client-side and relation fields that aren't columns on the jobs table
  // photos_purged is set only by the cron job — never let the app overwrite it
  const { items, job_items, id: _id, created_at, photos_purged, ...fields } = updates
  await supabase.from('jobs').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id)
}

// ─── Job items ────────────────────────────────────────────────────────────────

export async function dbAddItem(jobId, item) {
  if (!supabase) return
  // room_name and template_id are local-only — not columns in job_items
  const { parts, _key, room_name, template_id, ...fields } = item
  await supabase.from('job_items').insert({ job_id: jobId, ...fields })
  if (parts && parts.length > 0) {
    const rows = parts.map((p) => {
      const { _key: pk, ...pFields } = p
      return { job_item_id: item.id, ...pFields }
    })
    await supabase.from('job_item_parts').insert(rows)
  }
}

export async function dbRemoveItem(itemId) {
  if (!supabase) return
  await supabase.from('job_items').delete().eq('id', itemId)
}

export async function dbUpdateItem(itemId, updates) {
  if (!supabase) return
  const { parts, ...fields } = updates
  await supabase.from('job_items').update(fields).eq('id', itemId)
}

// ─── Suppliers ───────────────────────────────────────────────────────────────

export async function getSuppliers() {
  if (!supabase) return [{ id: 'mock', name: 'Joinery Hardware NZ', email: '', phone: '', contact_person: '', notes: '', is_default: true, active: true }]
  const { data } = await supabase.from('suppliers').select('*').eq('active', true).order('name')
  return data || []
}

export async function getDefaultSupplier() {
  if (!supabase) return { name: 'Joinery Hardware NZ', email: '' }
  const { data } = await supabase.from('suppliers').select('*').eq('is_default', true).eq('active', true).maybeSingle()
  return data || { name: 'Joinery Hardware NZ', email: '' }
}

export async function createSupplier(supplier) {
  if (!supabase) return
  await supabase.from('suppliers').insert(supplier)
}

export async function updateSupplier(id, updates) {
  if (!supabase) return
  await supabase.from('suppliers').update(updates).eq('id', id)
}

export async function deleteSupplier(id) {
  if (!supabase) return
  await supabase.from('suppliers').update({ active: false }).eq('id', id)
}

export async function setDefaultSupplier(id) {
  if (!supabase) return
  await supabase.from('suppliers').update({ is_default: false }).neq('id', '__never__')
  await supabase.from('suppliers').update({ is_default: true }).eq('id', id)
}

// ─── Settings ─────────────────────────────────────────────────────────────────
// Reads from the businesses table (RLS scopes to the authenticated user's business).
// Column name mapping: businesses.name → business_name, etc.

export async function getSettings() {
  if (!supabase) return null
  const [{ data: bizArr }, { data: zones }] = await Promise.all([
    supabase.from('businesses').select('*').order('created_at', { ascending: true }).limit(1),
    supabase.from('callout_zones').select('*').order('sort_order'),
  ])
  const biz = bizArr?.[0]
  if (!biz) return null
  return {
    business_name: biz.name,
    trading_name: biz.trading_name || '',
    legal_company_name: biz.legal_company_name || '',
    business_tagline: biz.business_tagline || '',
    contact_person_name: biz.contact_person_name || '',
    business_phone: biz.contact_phone,
    business_email: biz.contact_email,
    logo_url: biz.logo_url || '',
    home_base_address: biz.home_base_address,
    hourly_labour_rate: Number(biz.hourly_labour_rate),
    default_markup_pct: Number(biz.default_markup_pct),
    gst_rate: Number(biz.gst_rate),
    supplier_name: biz.supplier_name,
    supplier_email: biz.supplier_email,
    gst_number: biz.gst_number || '',
    bank_account_name: biz.bank_account_name || '',
    bank_name: biz.bank_name || '',
    bank_account_number: biz.bank_account_number || '',
    payment_terms: biz.payment_terms || 'Payment due on completion of work.',
    terms_and_conditions: biz.terms_and_conditions || '',
    rubber_waste_pct: biz.rubber_waste_pct != null ? Number(biz.rubber_waste_pct) : 10,
    window_size_bands: biz.window_size_bands
      ? (typeof biz.window_size_bands === 'string' ? JSON.parse(biz.window_size_bands) : biz.window_size_bands)
      : [
          { name: 'Small', perimeter_m: 3.0, labour_min: 15 },
          { name: 'Medium', perimeter_m: 4.4, labour_min: 20 },
          { name: 'Large', perimeter_m: 5.4, labour_min: 30 },
          { name: 'Extra large', perimeter_m: 7.0, labour_min: 40 },
        ],
    callout_zones: zones && zones.length > 0
      ? zones.map((z) => ({ ...z, fee: Number(z.fee), min_km: Number(z.min_km), max_km: z.max_km != null ? Number(z.max_km) : null }))
      : DEFAULT_CALLOUT_ZONES,
    day_start_minute: biz.day_start_minute != null ? Number(biz.day_start_minute) : 480,
    day_end_target_minute: biz.day_end_target_minute != null ? Number(biz.day_end_target_minute) : null,
    default_buffer_minutes: biz.default_buffer_minutes != null ? Number(biz.default_buffer_minutes) : 10,
    home_base_lat: biz.home_base_lat != null ? Number(biz.home_base_lat) : null,
    home_base_lng: biz.home_base_lng != null ? Number(biz.home_base_lng) : null,
    return_home_at_end: biz.return_home_at_end ?? false,
    preferred_nav_app: biz.preferred_nav_app || 'google_maps',
    pricing_wizard_dismissed: biz.pricing_wizard_dismissed ?? false,
    setup_complete: biz.setup_complete ?? false,
    active: biz.active ?? true,
    onboarding_complete: biz.onboarding_complete ?? false,
  }
}

export async function createBusiness({ owner_id, name, contact_person_name, contact_email }) {
  if (!supabase) return null
  const { data, error } = await supabase.from('businesses').insert({
    owner_id,
    name: name || 'My Business',
    contact_person_name: contact_person_name || '',
    contact_email: contact_email || '',
    setup_complete: false,
  }).select().single()
  if (error) {
    if (error.code === '23505') {
      const { data: existing } = await supabase.from('businesses').select('*').eq('owner_id', owner_id).maybeSingle()
      return existing
    }
    console.error('createBusiness failed:', error.message)
  }
  return data
}

export async function updateBusiness(fields) {
  if (!supabase) return
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { console.error('updateBusiness: no authenticated user'); return }
  const { error } = await supabase
    .from('businesses')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('owner_id', user.id)
  if (error) console.error('updateBusiness failed:', error.message)
}

export async function ensureBusinessFromMetadata() {
  if (!supabase) return null
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) console.error('ensureBusinessFromMetadata: getUser failed:', userError.message)
  if (!user) return null
  // Guard: if a business already exists for this user, do not create another one.
  const { data: existingArr } = await supabase
    .from('businesses').select('id').eq('owner_id', user.id).limit(1)
  const existing = existingArr?.[0]
  if (existing) return existing
  const name = user.user_metadata?.business_name || user.email?.split('@')[0] || 'My Business'
  const contact_person_name = user.user_metadata?.full_name || ''
  const result = await createBusiness({ owner_id: user.id, name, contact_person_name, contact_email: user.email || '' })
  if (!result) console.error('ensureBusinessFromMetadata: createBusiness returned null for user', user.id)
  return result
}

// ─── Planner ──────────────────────────────────────────────────────────────────

export async function getPlannerBacklog() {
  if (!supabase) return []
  const { data } = await supabase
    .from('jobs')
    .select('id, customer_name, customer_address, customer_lat, customer_lng, status, accepted_at, estimated_duration, schedule_state, created_at, callout_fee, hourly_rate, labour_hours, job_items(id, type, description, joinery_type_label, fault_label, job_item_parts(sell_price, qty))')
    .eq('status', 'accepted')
    .in('schedule_state', ['unassigned', 'needs_rebooking'])
    .order('accepted_at', { ascending: true, nullsFirst: false })
  return data || []
}

export async function getPlannerWeekJobs(weekStart, weekEnd) {
  if (!supabase) return []
  const { data } = await supabase
    .from('jobs')
    .select('id, customer_name, customer_address, customer_lat, customer_lng, customer_phone, status, scheduled_date, slot, estimated_duration, sequence_index, start_minute, start_overridden, schedule_state, callout_fee, hourly_rate, labour_hours, job_items(id, type, description, joinery_type_label, fault_label, job_item_parts(sell_price, qty))')
    .gte('scheduled_date', weekStart)
    .lte('scheduled_date', weekEnd)
    .order('scheduled_date', { ascending: true })
    .order('sequence_index', { ascending: true, nullsFirst: false })
  return data || []
}

export async function getPlannerMonthCounts(monthStart, monthEnd) {
  if (!supabase) return {}
  const { data } = await supabase
    .from('jobs')
    .select('scheduled_date')
    .gte('scheduled_date', monthStart)
    .lte('scheduled_date', monthEnd)
    .not('scheduled_date', 'is', null)
  const counts = {}
  ;(data || []).forEach(({ scheduled_date }) => {
    counts[scheduled_date] = (counts[scheduled_date] || 0) + 1
  })
  return counts
}

export async function dbAssignJob(jobId, { scheduled_date, slot, estimated_duration, sequence_index, start_minute, start_overridden = false }) {
  if (!supabase) return null
  const { error } = await supabase.from('jobs').update({
    schedule_state: 'assigned',
    scheduled_date,
    slot,
    estimated_duration,
    sequence_index,
    start_minute,
    start_overridden,
    updated_at: new Date().toISOString(),
  }).eq('id', jobId)
  if (error) console.error('dbAssignJob failed:', error.message)
  return error || null
}

export async function dbPinJobTime(jobId, startMin) {
  if (!supabase) return null
  const { error } = await supabase.from('jobs').update({
    start_minute: startMin,
    start_overridden: true,
    updated_at: new Date().toISOString(),
  }).eq('id', jobId)
  if (error) console.error('dbPinJobTime failed:', error.message)
  return error || null
}

export async function dbUnassignJob(jobId) {
  if (!supabase) return null
  const { error } = await supabase.from('jobs').update({
    schedule_state: 'unassigned',
    scheduled_date: null,
    slot: null,
    sequence_index: null,
    start_minute: null,
    updated_at: new Date().toISOString(),
  }).eq('id', jobId)
  if (error) console.error('dbUnassignJob failed:', error.message)
  return error || null
}

export async function dbBatchUpdateSchedule(updates) {
  if (!supabase || !updates.length) return null
  const results = await Promise.all(
    updates.map(({ id, ...fields }) =>
      supabase.from('jobs').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id)
    )
  )
  const err = results.find((r) => r.error)?.error
  if (err) console.error('dbBatchUpdateSchedule failed:', err.message)
  return err || null
}

export async function saveSettings(settings) {
  if (!supabase) return
  const { callout_zones, business_name, business_phone, business_email, ...rest } = settings
  const bizFields = {
    name: business_name,
    contact_phone: business_phone,
    contact_email: business_email,
    trading_name: rest.trading_name,
    legal_company_name: rest.legal_company_name,
    business_tagline: rest.business_tagline,
    contact_person_name: rest.contact_person_name,
    logo_url: rest.logo_url,
    home_base_address: rest.home_base_address,
    home_base_lat: rest.home_base_lat,
    home_base_lng: rest.home_base_lng,
    hourly_labour_rate: rest.hourly_labour_rate,
    default_markup_pct: rest.default_markup_pct,
    gst_rate: rest.gst_rate,
    gst_number: rest.gst_number,
    bank_account_name: rest.bank_account_name,
    bank_name: rest.bank_name,
    bank_account_number: rest.bank_account_number,
    payment_terms: rest.payment_terms,
    terms_and_conditions: rest.terms_and_conditions,
    supplier_name: rest.supplier_name,
    supplier_email: rest.supplier_email,
    rubber_waste_pct: rest.rubber_waste_pct,
    window_size_bands: rest.window_size_bands,
    day_start_minute: rest.day_start_minute,
    day_end_target_minute: rest.day_end_target_minute,
    default_buffer_minutes: rest.default_buffer_minutes,
    return_home_at_end: rest.return_home_at_end,
    preferred_nav_app: rest.preferred_nav_app,
    updated_at: new Date().toISOString(),
  }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { console.error('saveSettings: no authenticated user'); return }
  const { error } = await supabase.from('businesses').update(bizFields).eq('owner_id', user.id)
  if (error) console.error('saveSettings failed:', error.message)
  if (callout_zones) {
    await supabase.from('callout_zones').delete().neq('id', '__never__')
    const rows = callout_zones.map(({ business_id: _biz, id: _old, ...z }, i) => ({ ...z, id: crypto.randomUUID(), sort_order: i }))
    await supabase.from('callout_zones').insert(rows)
  }
}
