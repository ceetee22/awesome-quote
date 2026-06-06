import { createClient } from '@supabase/supabase-js'

function coordKey(lat, lng) {
  return `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`
}

// OSRM note: lng,lat order (opposite of most GIS). Returns null on any failure.
async function osrmMinutes(olat, olng, dlat, dlng) {
  try {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 6000)
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${olng},${olat};${dlng},${dlat}?overview=false`
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'AwesomeQuote/1.0 joinery-repair-app' },
    })
    clearTimeout(t)
    if (!res.ok) return null
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.[0]) return null
    return Math.round(data.routes[0].duration / 60)
  } catch {
    return null
  }
}

export async function POST(request) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const body = await request.json().catch(() => ({}))
  const pairs = body.pairs
  if (!Array.isArray(pairs) || !pairs.length) return Response.json({ results: [] })

  // Attach string keys to each pair
  const keyed = pairs.map((p) => ({
    ...p,
    ok: coordKey(p.olat, p.olng),
    dk: coordKey(p.dlat, p.dlng),
  }))

  // Deduplicate (same pair might appear for multiple days)
  const unique = []
  const seen = new Set()
  for (const p of keyed) {
    const k = `${p.ok}|${p.dk}`
    if (!seen.has(k)) { seen.add(k); unique.push(p) }
  }

  // Check cache — query all origin/dest combos in one round-trip
  const originKeys = [...new Set(unique.map((p) => p.ok))]
  const destKeys   = [...new Set(unique.map((p) => p.dk))]
  const { data: cached } = await sb
    .from('travel_cache')
    .select('origin_key, dest_key, minutes')
    .in('origin_key', originKeys)
    .in('dest_key', destKeys)

  const hit = {}
  for (const row of cached || []) hit[`${row.origin_key}|${row.dest_key}`] = Number(row.minutes)

  // Fetch misses from OSRM in parallel (cache means each pair is fetched once ever)
  const misses = unique.filter((p) => hit[`${p.ok}|${p.dk}`] == null)
  const osrmResults = await Promise.all(
    misses.map((p) => osrmMinutes(p.olat, p.olng, p.dlat, p.dlng))
  )

  const toStore = []
  for (let i = 0; i < misses.length; i++) {
    const p = misses[i]
    const minutes = osrmResults[i] ?? 10  // 10-min fallback keeps cascade running on OSRM failure
    hit[`${p.ok}|${p.dk}`] = minutes
    if (osrmResults[i] != null) {
      toStore.push({ origin_key: p.ok, dest_key: p.dk, minutes, fetched_at: new Date().toISOString() })
    }
  }

  if (toStore.length) {
    await sb.from('travel_cache').upsert(toStore, { onConflict: 'origin_key,dest_key' })
  }

  // Return results for every input pair (including dupes)
  const results = keyed.map((p) => ({ ok: p.ok, dk: p.dk, minutes: hit[`${p.ok}|${p.dk}`] ?? 10 }))
  return Response.json({ results })
}
