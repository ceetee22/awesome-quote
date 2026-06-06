import { createClient } from '@supabase/supabase-js'

function weatherAreaKey(lat, lng) {
  return `${Number(lat).toFixed(2)},${Number(lng).toFixed(2)}`
}

// WMO weather interpretation codes → our four conditions.
// Wind >= 40 km/h overrides clear/cloud (stays rain if raining + windy).
function wmoToCondition(code, windKmh) {
  const isRain = code >= 51
  const isWindy = windKmh >= 40
  if (isRain) return 'rain'
  if (isWindy) return 'windy'
  if (code <= 2) return 'sun'   // 0 clear, 1 mainly clear, 2 partly cloudy
  return 'cloud'                 // 3 overcast, 45–48 fog
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat'))
  const lng = parseFloat(searchParams.get('lng'))
  if (isNaN(lat) || isNaN(lng)) return Response.json({ error: 'lat and lng required' }, { status: 400 })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const areaKey = weatherAreaKey(lat, lng)
  const staleAfter = new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1-hour TTL

  // Check for 7 fresh rows
  const { data: cached } = await sb
    .from('weather_cache')
    .select('day, condition, temp_c')
    .eq('area_key', areaKey)
    .gte('fetched_at', staleAfter)
    .order('day')
    .limit(7)

  if (cached && cached.length >= 7) {
    return Response.json({ results: cached.map((r) => ({ date: r.day, condition: r.condition, temp_c: r.temp_c })) })
  }

  // Fetch fresh forecast from Open-Meteo (free, no key required)
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lng}` +
      `&daily=weathercode,temperature_2m_max,windspeed_10m_max` +
      `&timezone=Pacific%2FAuckland&forecast_days=7`

    const res = await fetch(url)
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
    const data = await res.json()

    const { time, weathercode, temperature_2m_max, windspeed_10m_max } = data.daily ?? {}
    if (!Array.isArray(time) || !time.length) throw new Error('Open-Meteo returned no daily data')

    const rows = time.map((day, i) => ({
      area_key: areaKey,
      day,
      condition: wmoToCondition(weathercode[i], windspeed_10m_max[i]),
      temp_c: Math.round(temperature_2m_max[i]),
      fetched_at: new Date().toISOString(),
    }))

    await sb.from('weather_cache').upsert(rows, { onConflict: 'area_key,day' })

    return Response.json({ results: rows.map((r) => ({ date: r.day, condition: r.condition, temp_c: r.temp_c })) })
  } catch {
    // Return whatever is in cache (possibly stale) rather than failing silently
    const { data: stale } = await sb
      .from('weather_cache')
      .select('day, condition, temp_c')
      .eq('area_key', areaKey)
      .order('day')
      .limit(7)
    return Response.json({ results: (stale || []).map((r) => ({ date: r.day, condition: r.condition, temp_c: r.temp_c })) })
  }
}
