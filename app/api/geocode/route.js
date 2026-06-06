export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  if (!q) return Response.json({ error: 'q required' }, { status: 400 })

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=nz`,
    { headers: { 'User-Agent': 'AwesomeQuote/1.0 joinery-repair-app' } }
  )
  const data = await res.json()
  return Response.json(data)
}
