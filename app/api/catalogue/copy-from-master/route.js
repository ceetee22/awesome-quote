import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const cookieStore = cookies()
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { supplier_id } = body || {}
  if (!supplier_id) {
    return NextResponse.json({ error: 'supplier_id required' }, { status: 400 })
  }

  // Fetch the user's business — scoped to owner_id (belt-and-suspenders)
  const { data: biz } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!biz) {
    return NextResponse.json({ error: 'No business found' }, { status: 400 })
  }

  // Fetch master supplier
  const { data: masterSupplier } = await supabase
    .from('master_suppliers')
    .select('name')
    .eq('id', supplier_id)
    .maybeSingle()

  if (!masterSupplier) {
    return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
  }

  // Fetch active master parts for this supplier
  const { data: masterParts, error: partsError } = await supabase
    .from('master_parts')
    .select('*')
    .eq('supplier_id', supplier_id)
    .eq('active', true)

  if (partsError) {
    console.error('copy-from-master: fetch master_parts failed:', partsError.message)
    return NextResponse.json({ error: 'Failed to fetch master parts' }, { status: 500 })
  }

  if (!masterParts || masterParts.length === 0) {
    return NextResponse.json({ count: 0 })
  }

  // Fetch existing SKUs for this business to avoid duplicates
  const { data: existingParts } = await supabase
    .from('parts')
    .select('sku')
    .eq('business_id', biz.id)

  const existingSkus = new Set(
    (existingParts || []).map((p) => p.sku).filter(Boolean)
  )

  // Build insert rows — skipping parts whose SKU already exists
  const toInsert = masterParts
    .filter((p) => !p.sku || !existingSkus.has(p.sku))
    .map((p) => ({
      id: uuidv4(),
      business_id: biz.id,
      sku: p.sku || '',
      name: p.name,
      category: p.category,
      rrp: p.rrp,
      sell_price: p.rrp,   // RRP as starting sell price
      cost_price: null,    // operator fills in their negotiated rate later
      fits: p.fits || [],
      fixes: p.fixes || [],
      default_qty: p.default_qty || 1,
      photo_url: p.photo_url,
      unit: p.unit || 'each',
      supplier: masterSupplier.name,
      supplier_code: '',
      active: true,
    }))

  if (toInsert.length === 0) {
    return NextResponse.json({ count: 0 })
  }

  // Insert in batches of 200 to stay within request size limits
  const BATCH_SIZE = 200
  let totalInserted = 0
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE)
    const { error } = await supabase.from('parts').insert(batch)
    if (error) {
      console.error('copy-from-master: insert failed:', error.message)
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
    }
    totalInserted += batch.length
  }

  return NextResponse.json({ count: totalInserted })
}
