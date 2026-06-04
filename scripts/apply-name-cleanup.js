// Applies catalogue name cleanup: strips SKU/supplier_code fragments from part names.
// Run without APPLY=1 to preview. Set APPLY=1 to write changes.
//
// Usage:
//   node scripts/apply-name-cleanup.js          (preview only)
//   APPLY=1 node scripts/apply-name-cleanup.js  (writes to DB)

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Finish/grade codes that must never be stripped from a name.
const FINISH_CODES = new Set([
  'ss', 'ss316', 'ss304', 'blk', 'wht', 'sil', 'brz', 'pss', 'sc', 'pb', 'pvd', 'orb', 'mb',
])

// SKUs whose names should be left entirely as-is (result would still be cryptic).
const SKIP_SKUS = new Set(['dw1685', 'lcl30r3p'])

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

// Returns true if the token is a finish/grade code that should never be stripped.
function isFinishCode(token) {
  return FINISH_CODES.has(token.toLowerCase())
}

// Returns true if the proposed cleaned name is safe to use.
// Rejects: fewer than 6 characters, or no alphabetic word of 3+ letters.
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

    // Pattern 1: trailing parenthetical " (TOKEN)" or "(TOKEN)"
    result = result.replace(/\s*\(([^)]+)\)\s*$/, (match, inner) => {
      return matches(inner, token) ? '' : match
    })

    // Pattern 2: trailing " - TOKEN" or " – TOKEN"
    result = result.replace(new RegExp(`\\s*[-–]\\s*${escapeRegex(token)}\\s*$`, 'i'), (match) => {
      return matches(match.replace(/^[\s\-–]+/, ''), token) ? '' : match
    })

    // Pattern 3: leading "TOKEN - " or "TOKEN " at start of string
    result = result.replace(new RegExp(`^${escapeRegex(token)}\\s*[-–]?\\s*`, 'i'), (match) => {
      const stripped = match.replace(/[-–\s]+$/, '').trim()
      return matches(stripped, token) ? '' : match
    })
  }

  // Tidy up orphaned punctuation
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
  const apply = process.env.APPLY === '1'

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

  const existingNamesLower = new Set(parts.map((p) => p.name.toLowerCase()))

  // First pass: compute all candidates and tag each with a skip reason if needed.
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

    const newLower = rawCleaned.toLowerCase()
    if (existingNamesLower.has(newLower) && newLower !== part.name.toLowerCase()) {
      candidates.push({ part, newName: rawCleaned, skipReason: 'duplicate of existing part' })
      continue
    }

    candidates.push({ part, newName: rawCleaned, skipReason: null })
  }

  // Second pass: detect within-batch collisions.
  const batchNewNamesLower = new Map()
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i]
    if (c.skipReason) continue
    const key = c.newName.toLowerCase()
    if (batchNewNamesLower.has(key)) {
      candidates[batchNewNamesLower.get(key)].skipReason = 'duplicate within batch'
      c.skipReason = 'duplicate within batch'
    } else {
      batchNewNamesLower.set(key, i)
    }
  }

  const changes = candidates.filter((c) => !c.skipReason)
  const skipped = candidates.filter((c) => c.skipReason)

  if (changes.length === 0) {
    console.log('No names would change.')
  } else {
    console.log(apply ? 'APPLYING RENAMES:' : 'PROPOSED RENAMES (preview):')
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

  console.log(`\nSummary: ${changes.length} to change, ${skipped.length} skipped, ${parts.length - candidates.length} unchanged (no token match).`)

  if (!apply) {
    console.log('\n⚠  Preview only — set APPLY=1 to write changes.')
    return
  }

  // Apply in batches of 50
  console.log(`\nApplying ${changes.length} updates...`)
  const BATCH = 50
  let updated = 0
  for (let i = 0; i < changes.length; i += BATCH) {
    const batch = changes.slice(i, i + BATCH)
    for (const { part: p, newName } of batch) {
      const { error: updateError } = await supabase
        .from('parts')
        .update({ name: newName })
        .eq('id', p.id)
      if (updateError) {
        console.error(`  Failed to update ID ${p.id}: ${updateError.message}`)
      } else {
        updated++
      }
    }
    console.log(`  ${Math.min(i + BATCH, changes.length)} / ${changes.length} processed`)
  }

  console.log(`\nDone. ${updated} of ${changes.length} parts renamed.`)
}

main()
