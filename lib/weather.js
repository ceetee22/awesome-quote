// Area key: 2 decimal places ≈ 1.1 km — enough for metro-wide forecast sharing.
export function weatherAreaKey(lat, lng) {
  return `${Number(lat).toFixed(2)},${Number(lng).toFixed(2)}`
}

// Visual styles for each of the four conditions.
// Sun uses amber-50/700 (soft pill, not the amber-500 used for the "long day" text warning).
export const WEATHER_STYLES = {
  sun:   { bg: 'bg-amber-50',  text: 'text-amber-700',  icon: '☀',  label: 'Sun'   },
  cloud: { bg: 'bg-slate-100', text: 'text-slate-600',  icon: '☁',  label: 'Cloud' },
  rain:  { bg: 'bg-blue-50',   text: 'text-blue-700',   icon: '🌧',  label: 'Rain'  },
  windy: { bg: 'bg-slate-200', text: 'text-slate-700',  icon: '💨',  label: 'Windy' },
}

// True when condition warrants an exposed-job scheduling hint.
export function isBadWeather(condition) {
  return condition === 'rain' || condition === 'windy'
}

// Derive whether a job leaves a physical opening in the building from its diagnosed items.
// Returns { exposed: bool }.
// Exposed = window/door can't fully close (broken stay, off-track roller, misaligned).
// Damp-sensitive = existing seal fault that rain makes worse.
export function classifyJob(job) {
  const items = (job.job_items || []).filter((i) => i.type === 'diagnosed')
  for (const item of items) {
    const fault = (item.fault_label || '').toLowerCase()
    if (/stay|off.?track|misalign/i.test(fault)) return { exposed: true }
  }
  return { exposed: false }
}

// Fetch the next 7 days of weather from the server-side cache + Open-Meteo proxy.
// Returns { [dateStr]: { condition, temp_c } }
export async function fetchWeather(lat, lng) {
  if (lat == null || lng == null) return {}
  try {
    const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}`)
    if (!res.ok) return {}
    const { results } = await res.json()
    const map = {}
    for (const r of results || []) map[r.date] = { condition: r.condition, temp_c: r.temp_c }
    return map
  } catch {
    return {}
  }
}
