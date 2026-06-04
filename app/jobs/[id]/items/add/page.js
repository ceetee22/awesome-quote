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

// ── Inline SVG icons ─────────────────────────────────────────────────────────

function SvgBase({ children }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full" aria-hidden="true">
      {children}
    </svg>
  )
}
function IconArrows()       { return <SvgBase><path d="M4 12H20M4 12L8 8M4 12L8 16M20 12L16 8M20 12L16 16"/></SvgBase> }
function IconColumns()      { return <SvgBase><path d="M3 3h8v18H3V3zM13 3h8v18h-8V3z"/></SvgBase> }
function IconDoor()         { return <SvgBase><path d="M4 2h12v20H4V2zM13 12h2"/></SvgBase> }
function IconWindow()       { return <SvgBase><path d="M3 3h18v18H3V3zM3 12h18M12 3v18"/></SvgBase> }
function IconPencil()       { return <SvgBase><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></SvgBase> }
function IconRuler()        { return <SvgBase><path d="M2 8h20v8H2V8zM7 8v4M11 8v3M15 8v4M19 8v3"/></SvgBase> }
function IconLock()         { return <SvgBase><path d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4"/></SvgBase> }
function IconAlertTriangle(){ return <SvgBase><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></SvgBase> }
function IconWrench()       { return <SvgBase><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></SvgBase> }
function IconWind()         { return <SvgBase><path d="M17.7 7.7a2.5 2.5 0 111.8 4.3H2M9.6 4.6A2 2 0 1111 8H2M12.6 19.4A2 2 0 1014 16H2"/></SvgBase> }
function IconAlign()        { return <SvgBase><path d="M21 6H3M21 12H9M21 18H3"/></SvgBase> }
function IconRefreshCw()    { return <SvgBase><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></SvgBase> }
function IconMoreDots() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full" aria-hidden="true">
      <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
    </svg>
  )
}

// Icon assignments for joinery types
const JOINERY_TYPE_ICONS = {
  sliding_door:  IconArrows,
  bifold_door:   IconColumns,
  hinged_door:   IconDoor,
  window_ali:    IconWindow,
  window_timber: IconWindow,
}

// Icon + grey-chip flag by fault label (lowercase key)
const FAULT_ICON_MAP = {
  'stiff or hard to slide':   { Icon: IconArrows,        grey: false },
  "won't lock or latch":      { Icon: IconLock,          grey: false },
  'off track or jumping':     { Icon: IconAlertTriangle, grey: false },
  'broken handle':            { Icon: IconWrench,        grey: false },
  'drafty or leaking':        { Icon: IconWind,          grey: false },
  'other':                    { Icon: IconMoreDots,      grey: true  },
  'stiff or dragging':        { Icon: IconArrows,        grey: false },
  'misaligned panels':        { Icon: IconAlign,         grey: false },
  'broken hinge':             { Icon: IconWrench,        grey: false },
  "won't fold or unfold":     { Icon: IconRefreshCw,     grey: false },
  'lock fault':               { Icon: IconLock,          grey: false },
  'stiff or sagging':         { Icon: IconArrows,        grey: false },
  "won't close properly":     { Icon: IconRefreshCw,     grey: false },
  'lock or latch fault':      { Icon: IconLock,          grey: false },
  "won't open or close":      { Icon: IconRefreshCw,     grey: false },
  'broken stay':              { Icon: IconWrench,        grey: false },
  'swollen or stuck':         { Icon: IconAlertTriangle, grey: false },
}
function getFaultMeta(label) {
  return FAULT_ICON_MAP[label.toLowerCase()] || { Icon: IconWrench, grey: false }
}

// Tappable picker card used for both type and fault screens
function PickerCard({ Icon, label, subtitle, grey, onClick }) {
  const chipBg    = grey ? 'bg-[#F1EFE8] group-active:bg-aq-green' : 'bg-aq-green-tint group-active:bg-aq-green'
  const iconColor = grey ? 'text-aq-muted group-active:text-white'  : 'text-aq-green group-active:text-white'
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full flex items-center gap-aq-md bg-white border border-aq-border rounded-aq-xl min-h-[56px] px-aq-lg py-aq-sm text-left hover:bg-aq-surface active:bg-aq-green-tint active:border-aq-green transition-colors duration-150"
    >
      {/* Icon chip */}
      <div className={`w-10 h-10 rounded-aq-lg flex items-center justify-center shrink-0 transition-colors duration-150 ${chipBg}`}>
        <div className={`w-5 h-5 transition-colors duration-150 ${iconColor}`}>
          <Icon />
        </div>
      </div>

      {/* Label + optional subtitle */}
      <div className="flex-1 min-w-0">
        <span className="block text-body font-medium text-aq-ink leading-snug">{label}</span>
        {subtitle && (
          <span className="block text-secondary text-aq-muted mt-[2px]">{subtitle}</span>
        )}
      </div>

      {/* Trailing chevron (normal) or tick (active) */}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-aq-subtle shrink-0 group-active:hidden transition-colors duration-150" aria-hidden="true">
        <path d="M9 18l6-6-6-6"/>
      </svg>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-aq-green shrink-0 hidden group-active:block" aria-hidden="true">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
    </button>
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
            {Object.entries(JOINERY_TYPE_LABELS).map(([value, label]) => {
              const IconComp = JOINERY_TYPE_ICONS[value]
              return (
                <PickerCard
                  key={value}
                  Icon={IconComp}
                  label={label}
                  onClick={() => selectJoineryType(value)}
                />
              )
            })}

            <div className="flex items-center gap-aq-md my-aq-sm">
              <div className="flex-1 h-px bg-aq-border" />
              <span className="text-caption text-aq-subtle">or</span>
              <div className="flex-1 h-px bg-aq-border" />
            </div>

            <PickerCard
              Icon={IconPencil}
              label="Custom item"
              grey
              onClick={() => router.push(`/jobs/${params.id}/items/custom`)}
            />

            <PickerCard
              Icon={IconRuler}
              label="Rubber and weatherseal estimate"
              subtitle="Quick estimate across many windows"
              grey
              onClick={() => router.push(`/jobs/${params.id}/items/rubber`)}
            />
          </div>
        )}

        {/* ── Step 2: Fault selection ── */}
        {step === 'fault' && (
          <div className="flex flex-col gap-[10px]">
            <p className="text-secondary text-aq-muted mb-aq-sm">What is wrong with it?</p>
            {faultOptions.map((option, idx) => {
              const { Icon, grey } = getFaultMeta(option.label)
              return (
                <PickerCard
                  key={idx}
                  Icon={Icon}
                  label={option.label}
                  grey={grey}
                  onClick={() => selectFault(option)}
                />
              )
            })}
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
