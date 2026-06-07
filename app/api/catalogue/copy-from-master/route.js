import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase-service'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  // Step 1: verify user auth via their session
  const cookieStore = cookies()
  const userClient = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  })

  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (!user) {
    console.error('copy-from-master: not authenticated', authError?.message)
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

  // Step 2: verify business ownership via user session (belt-and-suspenders)
  const { data: bizArr, error: bizError } = await userClient
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
  const biz = bizArr?.[0]

  if (!biz) {
    console.error('copy-from-master: no business for user', user.id, bizError?.message)
    return NextResponse.json({ error: 'No business found' }, { status: 400 })
  }

  // Step 3: use service role for all DB operations (ownership is verified above)
  const service = createServiceClient()
  if (!service) {
    return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })
  }

  // Fetch master supplier
  const { data: masterSupplier } = await service
    .from('master_suppliers')
    .select('name')
    .eq('id', supplier_id)
    .maybeSingle()

  if (!masterSupplier) {
    return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
  }

  // Fetch active master parts for this supplier
  const { data: masterParts, error: partsError } = await service
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
  const { data: existingParts } = await service
    .from('parts')
    .select('sku')
    .eq('business_id', biz.id)

  const existingSkus = new Set(
    (existingParts || []).map((p) => p.sku).filter(Boolean)
  )

  // Build insert rows — skip any part whose SKU already exists in this business
  const toInsert = masterParts
    .filter((p) => !p.sku || !existingSkus.has(p.sku))
    .map((p) => ({
      id: uuidv4(),
      business_id: biz.id,
      sku: p.sku || '',
      name: p.name,
      category: p.category || 'other',
      sell_price: p.rrp || 0,  // RRP as starting sell price; operator adjusts later
      cost_price: 0,            // operator fills in their negotiated rate
      fits: p.fits || [],
      fixes: p.fixes || [],
      default_qty: p.default_qty || 1,
      photo_url: p.photo_url || null,
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
    const { error } = await service.from('parts').insert(batch)
    if (error) {
      console.error('copy-from-master: insert failed:', error.message, error.code, error.details)
      return NextResponse.json({ error: 'Insert failed', detail: error.message }, { status: 500 })
    }
    totalInserted += batch.length
  }

  return NextResponse.json({ count: totalInserted })
}
