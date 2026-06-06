// Coordinate key: 4 decimal places ≈ 11 m precision, stable across minor GPS drift.
export function coordKey(lat, lng) {
  return `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`
}

// Build ordered origin→dest pairs for a day's drive:
//   home → job[0] → job[1] → … → job[n-1]
// Jobs without coordinates are skipped (their leg falls back to 0 in cascade).
export function buildDayPairs(jobs, homeLat, homeLng) {
  if (!jobs.length || homeLat == null || homeLng == null) return []
  const stops = [
    { lat: homeLat, lng: homeLng },
    ...jobs.map((j) => ({ lat: j.customer_lat, lng: j.customer_lng })),
  ]
  const pairs = []
  for (let i = 0; i < stops.length - 1; i++) {
    const o = stops[i]
    const d = stops[i + 1]
    if (o.lat != null && o.lng != null && d.lat != null && d.lng != null) {
      pairs.push({ olat: o.lat, olng: o.lng, dlat: d.lat, dlng: d.lng })
    }
  }
  return pairs
}

// POST pairs to /api/travel (server-side cache + OSRM proxy).
// Returns a flat map: `${ok}|${dk}` → minutes
export async function fetchTravelTimes(pairs) {
  if (!pairs.length) return {}
  try {
    const res = await fetch('/api/travel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pairs }),
    })
    if (!res.ok) return {}
    const { results } = await res.json()
    const map = {}
    for (const r of results || []) map[`${r.ok}|${r.dk}`] = r.minutes
    return map
  } catch {
    return {}
  }
}
