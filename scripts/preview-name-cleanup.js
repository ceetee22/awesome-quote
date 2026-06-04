// Preview-only: shows which part names contain their own SKU or supplier_code
// and what the cleaned name would look like. Writes nothing to the database.
//
// Usage: node scripts/preview-name-cleanup.js

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const FINISH_CODES = new Set([
  'ss', 'ss316', 'ss304', 'blk', 'wht', 'sil', 'brz', 'pss', 'sc', 'pb', 'pvd', 'orb', 'mb',
])

const SKIP_SKUS = new Set(['dw1685', 'lcl30r3p'])

// Words that signal the SKU was fused to a product-line name, not a clean prefix.
// If the cleaned name starts with one of these, the SKU was load-bearing — skip the rename.
const CONTINUATION_WORDS = new Set(['series', 'type', 'mk', 'model'])

function loadEnv() {
  const envPath = resolve(__dirname, '../.env.local')
  const lines = readFileSync(envPath, 'utf8').split('\n')
  const env = {}
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return env
}

function getTokens(sku, supplierCode) {
  const tokens = new Set()
  if (sku && sku.trim()) tokens.add(sku.trim())
  if (supplierCode && supplierCode.trim()) tokens.add(supplierCode.trim())
  return [...tokens]
}

function matches(a, b) {
  return a.replace(/\s+/g, '').toLowerCase() === b.replace(/\s+/g, '').toLowerCase()
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isFinishCode(token) {
  return FINISH_CODES.has(token.toLowerCase())
}

function isSafeName(name) {
  if (name.length < 6) return false
  if (!/[a-zA-Z]{3,}/.test(name)) return false
  return true
}

function startsContinuationWord(name) {
  const first = name.trim().split(/\s+/)[0].toLowerCase()
  return CONTINUATION_WORDS.has(first)
}

function cleanName(name, sku, supplierCode) {
  const tokens = getTokens(sku, supplierCode)
  if (tokens.length === 0) return name

  let result = name

  for (const token of tokens) {
    if (!token) continue
    if (isFinishCode(token)) continue

    result = result.replace(/\s*\(([^)]+)\)\s*$/, (match, inner) => {
      return matches(inner, token) ? '' : match
    })

    result = result.replace(new RegExp(`\\s*[-–]\\s*${escapeRegex(token)}\\s*$`, 'i'), (match) => {
      return matches(match.replace(/^[\s\-–]+/, ''), token) ? '' : match
    })

    result = result.replace(new RegExp(`^${escapeRegex(token)}\\s*[-–]?\\s*`, 'i'), (match) => {
      const stripped = match.replace(/[-–\s]+$/, '').trim()
      return matches(stripped, token) ? '' : match
    })
  }

  result = result
    .replace(/\s*[-–]\s*$/, '')
    .replace(/^\s*[-–]\s*/, '')
    .replace(/\(\s*\)/g, '')
    .trim()

  return result
}

async function fetchAllParts(supabase) {
  const BATCH = 1000
  const all = []
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('parts')
      .select('id, name, sku, supplier_code')
      .order('name')
      .range(offset, offset + BATCH - 1)
    if (error) throw error
    all.push(...data)
    if (data.length < BATCH) break
    offset += BATCH
  }
  return all
}

async function main() {
  const env = loadEnv()
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
    process.exit(1)
  }

  const supabase = createClient(url, key)

  const { count: total } = await supabase
    .from('parts')
    .select('*', { count: 'exact', head: true })

  const parts = await fetchAllParts(supabase)
  console.log(`Loaded ${parts.length} / ${total} parts.\n`)

  // Build a case-insensitive set of all current names in the table.
  // Used to detect whether a proposed new name already exists elsewhere.
  const existingNamesLower = new Set(parts.map((p) => p.name.toLowerCase()))

  // First pass: compute all candidate renames and tag each with a skip reason if needed.
  // We also need to detect within-batch collisions, so we collect new names first.
  const candidates = []

  for (const part of parts) {
    if (part.sku && SKIP_SKUS.has(part.sku.toLowerCase())) continue

    const rawCleaned = cleanName(part.name, part.sku, part.supplier_code)
    if (rawCleaned === part.name) continue

    if (!isSafeName(rawCleaned)) {
      candidates.push({ part, newName: rawCleaned, skipReason: 'cryptic remainder' })
      continue
    }

    if (startsContinuationWord(rawCleaned)) {
      candidates.push({ part, newName: rawCleaned, skipReason: 'SKU fused to product-line name' })
      continue
    }

    // Check if the new name already exists as another part's CURRENT name.
    // (Exclude the part's own current name — it's being renamed away from it.)
    const newLower = rawCleaned.toLowerCase()
    if (existingNamesLower.has(newLower) && newLower !== part.name.toLowerCase()) {
      candidates.push({ part, newName: rawCleaned, skipReason: 'duplicate of existing part' })
      continue
    }

    candidates.push({ part, newName: rawCleaned, skipReason: null })
  }

  // Second pass: detect within-batch duplicates (two candidates renaming to the same name).
  const batchNewNamesLower = new Map() // newNameLower → first candidate index
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i]
    if (c.skipReason) continue
    const key = c.newName.toLowerCase()
    if (batchNewNamesLower.has(key)) {
      // Both this and the earlier one are duplicates of each other
      candidates[batchNewNamesLower.get(key)].skipReason = 'duplicate within batch'
      c.skipReason = 'duplicate within batch'
    } else {
      batchNewNamesLower.set(key, i)
    }
  }

  const changes = candidates.filter((c) => !c.skipReason)
  const skipped = candidates.filter((c) => c.skipReason)
  const unchanged = parts.length - candidates.length

  if (changes.length === 0) {
    console.log('No names would change.')
  } else {
    console.log('WOULD APPLY:')
    console.log('─'.repeat(90))
    for (const { part: p, newName } of changes) {
      console.log(`ID: ${p.id}`)
      console.log(`  SKU:           ${p.sku || '(none)'}`)
      console.log(`  Supplier code: ${p.supplier_code || '(none)'}`)
      console.log(`  OLD: ${p.name}`)
      console.log(`  NEW: ${newName}`)
      console.log()
    }
    console.log('─'.repeat(90))
  }

  if (skipped.length > 0) {
    console.log(`\nSKIPPED (${skipped.length}):`)
    for (const { part: p, newName, skipReason } of skipped) {
      console.log(`  OLD: ${p.name}`)
      console.log(`  → "${newName}"  [${skipReason}]`)
    }
  }

  console.log(`\nSummary: ${changes.length} would apply, ${skipped.length} skipped, ${unchanged} unchanged (no token match).`)
  console.log('\n⚠  Preview only — nothing written to the database.')
}

main()
