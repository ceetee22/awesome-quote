'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import {
  JOINERY_TYPE_LABELS,
  FAULT_OPTIONS,
  PART_CATEGORY,
  PART_CATEGORY_LABELS,
} from '@/lib/constants'
import { getPartsByFitsAndFixes, getParts } from '@/lib/db'
import { useJob } from '@/lib/job-context'
import { useSettings } from '@/lib/settings-context'
import { formatCurrency } from '@/lib/pricing'
import Button from '@/components/Button'
import BackButton from '@/components/BackButton'
import Stepper from '@/components/Stepper'
import PhotoCapture from '@/components/PhotoCapture'

function PartPhoto({ name }) {
  return (
    <div className="w-14 h-14 rounded-aq-md bg-aq-green-tint flex items-center justify-center shrink-0">
      <span className="text-section font-medium text-aq-green">
        {name ? name[0].toUpperCase() : '?'}
      </span>
    </div>
  )
}

// Shared card for both suggested parts and search results
function PartPickerCard({ part, partState, onToggle, onSetQty }) {
  const ps = partState[part.id]
  const isSelected = ps?.selected ?? false
  const qty = ps?.qty ?? part.default_qty ?? 1

  return (
    <div className={`bg-white border rounded-aq-xl p-aq-lg transition-colors duration-150 ${
      isSelected ? 'border-aq-green' : 'border-aq-border'
    }`}>
      <div className="flex items-start gap-aq-md mb-aq-md">
        <PartPhoto name={part.name} />
        <div className="flex-1 min-w-0">
          <p className="text-body font-medium text-aq-ink leading-snug">{part.name}</p>
          <p className="text-caption text-aq-muted mt-aq-xs">
            {part.sku}{part.supplier ? ` · ${part.supplier}` : ''}
          </p>
          <p className="text-body font-medium text-aq-green mt-aq-xs">
            {formatCurrency(part.sell_price)}{' '}
            <span className="text-caption text-aq-subtle font-regular">/ {part.unit}</span>
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-aq-md">
        <Stepper value={qty} onChange={(v) => onSetQty(part, v)} min={1} max={20} />
        <button
          type="button"
          onClick={() => onToggle(part)}
          className={`min-h-tap px-aq-xl text-btn font-medium rounded-aq-lg border transition-colors duration-150 ${
            isSelected
              ? 'bg-aq-green text-white border-aq-green'
              : 'bg-white text-aq-ink border-aq-border hover:bg-aq-surface'
          }`}
        >
          {isSelected ? 'Added' : 'Add'}
        </button>
      </div>
    </div>
  )
}

const FILTER_CATEGORIES = [
  PART_CATEGORY.ROLLERS,
  PART_CATEGORY.STAYS,
  PART_CATEGORY.HINGES,
  PART_CATEGORY.LOCKS,
  PART_CATEGORY.HANDLES,
  PART_CATEGORY.SEALS,
]

export default function AddItemPage() {
  const params = useParams()
  const router = useRouter()
  const { currentJob, addItem } = useJob()
  const { settings } = useSettings()

  const [itemId] = useState(() => uuidv4())
  const [beforePhotos, setBeforePhotos] = useState([])

  const [step, setStep] = useState('type')
  const [joineryType, setJoineryType] = useState(null)
  const [faultValue, setFaultValue] = useState(null)
  const [faultLabel, setFaultLabel] = useState('')
  // { [partId]: { part, qty, selected } } — holds both suggestion and search-picked parts
  const [partState, setPartState] = useState({})
  const [loadingParts, setLoadingParts] = useState(false)

  // Inline search
  const [allParts, setAllParts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchCategory, setSearchCategory] = useState(null)

  // Load full catalogue once when step 3 is reached (runs in parallel with suggestion fetch)
  useEffect(() => {
    if (step === 'parts') {
      getParts().then(setAllParts)
    }
  }, [step])

  function handleBack() {
    if (step === 'fault') {
      setStep('type')
      setJoineryType(null)
    } else if (step === 'parts') {
      setStep('fault')
      setFaultValue(null)
      setFaultLabel('')
      setPartState({})
      setSearchQuery('')
      setSearchCategory(null)
    } else {
      const hasItems = (currentJob?.items?.length ?? 0) > 0
      router.push(hasItems ? `/jobs/${params.id}/items` : `/jobs/${params.id}`)
    }
  }

  function selectJoineryType(type) {
    setJoineryType(type)
    setStep('fault')
  }

  async function selectFault(option) {
    setFaultValue(option.value)
    setFaultLabel(option.label)
    setPartState({})
    setSearchQuery('')
    setSearchCategory(null)
    setLoadingParts(true)
    setStep('parts')

    const suggestions = await getPartsByFitsAndFixes(joineryType, option.value)
    const initial = {}
    suggestions.forEach((p) => {
      initial[p.id] = { part: p, qty: p.default_qty || 1, selected: false }
    })
    setPartState(initial)
    setLoadingParts(false)
  }

  // Unified toggle — works for both pre-loaded suggestions and catalogue parts
  function togglePart(part) {
    setPartState((prev) => {
      if (prev[part.id]) {
        return { ...prev, [part.id]: { ...prev[part.id], selected: !prev[part.id].selected } }
      }
      return { ...prev, [part.id]: { part, qty: part.default_qty || 1, selected: true } }
    })
  }

  function setQty(part, qty) {
    setPartState((prev) => {
      if (prev[part.id]) {
        return { ...prev, [part.id]: { ...prev[part.id], qty } }
      }
      return { ...prev, [part.id]: { part, qty, selected: false } }
    })
  }

  function handleAddToJob() {
    const chosenParts = Object.values(partState)
      .filter((ps) => ps.selected)
      .map((ps) => ({
        part_id: ps.part.id,
        name: ps.part.name,
        sku: ps.part.sku,
        sell_price: ps.part.sell_price,
        cost_price: ps.part.cost_price,
        qty: ps.qty,
        unit: ps.part.unit,
        supplier: ps.part.supplier,
        supplier_code: ps.part.supplier_code,
      }))

    addItem({
      id: itemId,
      type: 'diagnosed',
      joinery_type: joineryType,
      joinery_type_label: JOINERY_TYPE_LABELS[joineryType],
      fault: faultValue,
      fault_label: faultLabel,
      parts: chosenParts,
      labour_hours: 0,
      hourly_rate: settings?.hourly_labour_rate || 95,
      photos: beforePhotos,
    })

    router.push(`/jobs/${params.id}/items`)
  }

  const faultOptions = joineryType ? FAULT_OPTIONS[joineryType] : []
  const hasSelected = Object.values(partState).some((ps) => ps.selected)

  // Relevance-based ranking for the top 3 suggestions
  const FAULT_PRIMARY_KW = {
    stiff:           ['roller', 'carriage', 'wheel', 'runner'],
    wont_lock:       ['lock', 'latch', 'catch', 'striker'],
    broken_hardware: ['stay', 'hinge', 'handle', 'roller'],
    drafty:          ['seal', 'weather', 'brush', 'strip'],
    misaligned:      ['roller', 'carriage', 'track'],
    other:           [],
  }
  const JOINERY_SECONDARY_KW = {
    sliding_door:  ['sliding'],
    window_ali:    ['window'],
    window_timber: ['window', 'timber'],
    bifold_door:   ['bifold'],
    hinged_door:   ['door'],
  }
  const ACCESSORY_KW = ['packer', 'side wing', 'guide', 'cover', 'cap', 'spacer', 'screw', 'end cap']

  function partRelevanceScore(part) {
    const name = part.name.toLowerCase()
    let score = 0
    const faultKws   = FAULT_PRIMARY_KW[faultValue]   || []
    const joineryKws = JOINERY_SECONDARY_KW[joineryType] || []
    if (faultKws.some((kw) => name.includes(kw)))     score += 20
    if (joineryKws.some((kw) => name.includes(kw)))   score += 5
    if (ACCESSORY_KW.some((kw) => name.includes(kw))) score -= 15
    if (part.photo_url) score += 2
    return score
  }

  const topSuggestions = Object.values(partState)
    .map((ps) => ps.part)
    .sort((a, b) => {
      const scoreDiff = partRelevanceScore(b) - partRelevanceScore(a)
      if (scoreDiff !== 0) return scoreDiff
      // Same score: prefer higher price (not the absolute cheapest, which tends to be accessories)
      return (b.sell_price || 0) - (a.sell_price || 0)
    })
    .slice(0, 3)

  const topSuggestionIds = new Set(topSuggestions.map((p) => p.id))

  // Search results — exclude top suggestions to avoid duplication
  const showSearchResults = !!(searchQuery.trim() || searchCategory)
  const searchResults = showSearchResults
    ? allParts
        .filter((p) => {
          if (!p.active || topSuggestionIds.has(p.id)) return false
          if (searchCategory && p.category !== searchCategory) return false
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
          }
          return true
        })
        .slice(0, 10)
    : []

  // Page title / subtitle / back label
  let pageTitle = 'Add item'
  let pageSubtitle = null
  let backLabel = (currentJob?.items?.length ?? 0) > 0 ? 'Items' : 'Customer'
  if (step === 'fault') {
    pageTitle = JOINERY_TYPE_LABELS[joineryType]
    backLabel = 'Add item'
  }
  if (step === 'parts') {
    pageTitle = 'Suggested parts'
    pageSubtitle = `${JOINERY_TYPE_LABELS[joineryType]} / ${faultLabel}`
    backLabel = 'Faults'
  }

  return (
    <div className="min-h-dvh bg-aq-surface">
      {/* Scrollable content — pb-32 clears the fixed button */}
      <div className="max-w-[480px] mx-auto px-aq-lg pb-32">

        {/* Header */}
        <div className="flex items-center gap-aq-sm py-aq-xl">
          <BackButton onClick={handleBack} label={backLabel} />
          <div className="ml-aq-sm">
            <h1 className="text-page-title font-medium text-aq-ink">{pageTitle}</h1>
            {pageSubtitle && (
              <p className="text-secondary text-aq-muted">{pageSubtitle}</p>
            )}
          </div>
        </div>

        {/* ── Step 1: Joinery type ── */}
        {step === 'type' && (
          <div className="flex flex-col gap-[10px]">
            {Object.entries(JOINERY_TYPE_LABELS).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => selectJoineryType(value)}
                className="w-full min-h-tap px-aq-xl text-body font-medium text-aq-ink bg-white border border-aq-border rounded-aq-xl text-left hover:bg-aq-surface active:bg-aq-border transition-colors duration-150"
              >
                {label}
              </button>
            ))}

            <div className="flex items-center gap-aq-md my-aq-sm">
              <div className="flex-1 h-px bg-aq-border" />
              <span className="text-caption text-aq-subtle">or</span>
              <div className="flex-1 h-px bg-aq-border" />
            </div>

            <button
              type="button"
              onClick={() => router.push(`/jobs/${params.id}/items/custom`)}
              className="w-full min-h-tap px-aq-xl text-body font-medium text-aq-ink bg-white border border-aq-border rounded-aq-xl text-left hover:bg-aq-surface active:bg-aq-border transition-colors duration-150"
            >
              Custom item
            </button>

            <button
              type="button"
              onClick={() => router.push(`/jobs/${params.id}/items/rubber`)}
              className="w-full min-h-tap px-aq-xl bg-white border border-aq-border rounded-aq-xl text-left hover:bg-aq-surface active:bg-aq-border transition-colors duration-150 py-3"
            >
              <span className="block text-body font-medium text-aq-ink">Rubber and weatherseal estimate</span>
              <span className="block text-secondary text-aq-muted font-normal mt-0.5">Quick estimate across many windows</span>
            </button>
          </div>
        )}

        {/* ── Step 2: Fault selection ── */}
        {step === 'fault' && (
          <div className="flex flex-col gap-[10px]">
            <p className="text-secondary text-aq-muted mb-aq-sm">What is wrong with it?</p>
            {faultOptions.map((option, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectFault(option)}
                className="w-full min-h-tap px-aq-xl text-body font-medium text-aq-ink bg-white border border-aq-border rounded-aq-xl text-left hover:bg-aq-surface active:bg-aq-border transition-colors duration-150"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Step 3: Parts picker ── */}
        {step === 'parts' && (
          <div className="flex flex-col gap-aq-lg">
            {loadingParts ? (
              <p className="text-body text-aq-muted text-center py-aq-2xl">Loading...</p>
            ) : (
              <>
                {/* Suggested parts — top 3 */}
                {topSuggestions.length > 0 ? (
                  <div>
                    <h2 className="text-[18px] font-medium text-aq-ink mb-aq-md">
                      Recommended for this repair
                    </h2>
                    <div className="flex flex-col gap-[10px]">
                      {topSuggestions.map((part) => (
                        <PartPickerCard
                          key={part.id}
                          part={part}
                          partState={partState}
                          onToggle={togglePart}
                          onSetQty={setQty}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg text-center">
                    <p className="text-secondary text-aq-muted">
                      No parts found for this fault. Search below to add parts manually.
                    </p>
                  </div>
                )}

                {/* Divider */}
                <div className="flex items-center gap-aq-md">
                  <div className="flex-1 h-px bg-aq-border" />
                  <span className="text-caption text-aq-subtle">or search</span>
                  <div className="flex-1 h-px bg-aq-border" />
                </div>

                {/* Inline search + category filter */}
                <div className="flex flex-col gap-aq-md">
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for a different part"
                    className="w-full bg-white border border-aq-border rounded-aq-md min-h-tap px-4 text-body text-aq-ink placeholder:text-aq-subtle focus:outline-none focus:border-aq-green transition-colors"
                  />

                  {/* Category pills — horizontally scrollable on small screens */}
                  <div className="flex gap-aq-sm overflow-x-auto -mx-aq-lg px-aq-lg pb-1">
                    <button
                      type="button"
                      onClick={() => setSearchCategory(null)}
                      className={`shrink-0 min-h-tap px-aq-lg text-secondary font-medium rounded-aq-lg border transition-colors duration-150 ${
                        searchCategory === null
                          ? 'border-aq-green bg-aq-green-tint text-aq-green'
                          : 'border-aq-border text-aq-muted bg-white'
                      }`}
                    >
                      All
                    </button>
                    {FILTER_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSearchCategory((prev) => prev === cat ? null : cat)}
                        className={`shrink-0 min-h-tap px-aq-lg text-secondary font-medium rounded-aq-lg border transition-colors duration-150 ${
                          searchCategory === cat
                            ? 'border-aq-green bg-aq-green-tint text-aq-green'
                            : 'border-aq-border text-aq-muted bg-white'
                        }`}
                      >
                        {PART_CATEGORY_LABELS[cat]}
                      </button>
                    ))}
                  </div>

                  {/* Results */}
                  {showSearchResults && (
                    <div className="flex flex-col gap-[10px]">
                      {searchResults.length === 0 ? (
                        <p className="text-secondary text-aq-muted text-center py-aq-md">
                          No parts found.
                        </p>
                      ) : (
                        searchResults.map((part) => (
                          <PartPickerCard
                            key={part.id}
                            part={part}
                            partState={partState}
                            onToggle={togglePart}
                            onSetQty={setQty}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Before photos — shown on step 3 after parts are loaded */}
        {step === 'parts' && !loadingParts && (
          <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg mt-aq-lg">
            <PhotoCapture
              label="Before photos"
              buttonLabel="Add before photo"
              photos={beforePhotos}
              onChange={setBeforePhotos}
              uploadOpts={{ jobId: currentJob?.id, itemId, type: 'before' }}
            />
          </div>
        )}

      </div>

      {/* Fixed bottom "Add to job" — only on step 3 */}
      {step === 'parts' && !loadingParts && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-aq-border px-aq-lg py-aq-md">
          <div className="max-w-[480px] mx-auto">
            <Button variant="primary" fullWidth disabled={!hasSelected} onClick={handleAddToJob}>
              Add to job
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
