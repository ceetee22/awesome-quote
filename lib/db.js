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

// ─── Jobs ─────────────────────────────────────────────────────────────────────

function transformJob(row) {
  return {
    ...row,
    items: (row.job_items || []).map((item) => ({
      ...item,
      parts: item.job_item_parts || [],
    })),
  }
}

export async function getJobs() {
  if (!supabase) return []
  const { data } = await supabase
    .from('jobs')
    .select('*, job_items(*, job_item_parts(*))')
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
  const { items, ...fields } = updates
  await supabase.from('jobs').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id)
}

// ─── Job items ────────────────────────────────────────────────────────────────

export async function dbAddItem(jobId, item) {
  if (!supabase) return
  const { parts, _key, ...fields } = item
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

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings() {
  if (!supabase) return null
  const [{ data: row }, { data: zones }] = await Promise.all([
    supabase.from('settings').select('*').eq('id', 1).single(),
    supabase.from('callout_zones').select('*').order('sort_order'),
  ])
  if (!row) return null
  return {
    business_name: row.business_name,
    business_phone: row.business_phone,
    business_email: row.business_email,
    home_base_address: row.home_base_address,
    hourly_labour_rate: Number(row.hourly_labour_rate),
    default_markup_pct: Number(row.default_markup_pct),
    gst_rate: Number(row.gst_rate),
    supplier_name: row.supplier_name,
    supplier_email: row.supplier_email,
    callout_zones: zones && zones.length > 0
      ? zones.map((z) => ({ ...z, fee: Number(z.fee), min_km: Number(z.min_km), max_km: z.max_km != null ? Number(z.max_km) : null }))
      : DEFAULT_CALLOUT_ZONES,
  }
}

export async function saveSettings(settings) {
  if (!supabase) return
  const { callout_zones, ...fields } = settings
  await supabase.from('settings').upsert({ id: 1, ...fields, updated_at: new Date().toISOString() })
  if (callout_zones) {
    await supabase.from('callout_zones').delete().neq('id', '__never__')
    const rows = callout_zones.map((z, i) => ({ ...z, sort_order: i }))
    await supabase.from('callout_zones').insert(rows)
  }
}
