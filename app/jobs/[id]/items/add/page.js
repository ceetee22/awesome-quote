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
import { formatCurrency, calcGst } from '@/lib/pricing'
import Button from '@/components/Button'
import BackButton from '@/components/BackButton'
import Stepper from '@/components/Stepper'
import PhotoCapture from '@/components/PhotoCapture'

// ── Inline SVG icons ─────────────────────────────────────────────────────────

function SvgBase({ children }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full" aria-hidden="true">
      {children}
    </svg>
  )
}
function IconArrows()        { return <SvgBase><path d="M4 12H20M4 12L8 8M4 12L8 16M20 12L16 8M20 12L16 16"/></SvgBase> }
function IconLock()          { return <SvgBase><path d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4"/></SvgBase> }
function IconAlertTriangle() { return <SvgBase><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></SvgBase> }
function IconWrench()        { return <SvgBase><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></SvgBase> }
function IconWind()          { return <SvgBase><path d="M17.7 7.7a2.5 2.5 0 111.8 4.3H2M9.6 4.6A2 2 0 1111 8H2M12.6 19.4A2 2 0 1014 16H2"/></SvgBase> }
function IconAlign()         { return <SvgBase><path d="M21 6H3M21 12H9M21 18H3"/></SvgBase> }
function IconRefreshCw()     { return <SvgBase><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></SvgBase> }
function IconMoreDots() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full" aria-hidden="true">
      <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
    </svg>
  )
}

// Icon + grey-chip flag by fault label
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

// ── Fault picker card (tangible 3px border) ───────────────────────────────────

function FaultCard({ Icon, label, grey, onClick }) {
  const chipBg    = grey ? '#F1EFE8' : '#E6F7F0'
  const iconColor = grey ? '#8CA3A0'  : '#22A67A'

  function pressDown(e) {
    e.currentTarget.style.transform = 'translateY(2px)'
    e.currentTarget.style.borderBottomWidth = '1px'
  }
  function pressUp(e) {
    e.currentTarget.style.transform = ''
    e.currentTarget.style.borderBottomWidth = '3px'
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={pressDown}
      onPointerUp={pressUp}
      onPointerLeave={pressUp}
      style={{
        background: '#FFFFFF',
        border: '0.5px solid #E4EAE8',
        borderBottom: '3px solid #E4EAE8',
        borderRadius: 12,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        width: '100%',
        minHeight: 64,
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'transform 80ms, border-bottom-width 80ms',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 8, background: chipBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <div style={{ width: 20, height: 20, color: iconColor }}>
          <Icon />
        </div>
      </div>
      <span style={{ flex: 1, fontSize: 16, fontWeight: 500, color: '#1F2D37', lineHeight: 1.3 }}>{label}</span>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8CA3A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
        <path d="M9 18l6-6-6-6" />
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
  const { currentJob, addItem, setCurrentJob } = useJob()
  const { settings } = useSettings()

  const hourlyRate = settings?.hourly_labour_rate || 95
  const GST_RATE = settings?.gst_rate || 15
  const zones = settings?.callout_zones || []

  const [itemId, setItemId] = useState(() => uuidv4())
  const [beforePhotos, setBeforePhotos] = useState([])

  const [step, setStep] = useState('type')
  const [joineryType, setJoineryType] = useState(null)
  const [faultValue, setFaultValue] = useState(null)
  const [faultLabel, setFaultLabel] = useState('')
  const [partState, setPartState] = useState({})
  const [loadingParts, setLoadingParts] = useState(false)

  // Labour + callout state (set in parts step, saved to job on proceed)
  const [labourHours, setLabourHours] = useState(() => currentJob?.labour_hours || 1)
  const [calloutFee, setCalloutFee] = useState(() => {
    if (currentJob?.callout_fee != null) return currentJob.callout_fee
    return zones[0]?.fee ?? 50
  })
  const [selectedZoneId, setSelectedZoneId] = useState(() => {
    if (currentJob?.callout_fee != null) {
      return zones.find((z) => z.fee === currentJob.callout_fee)?.id ?? null
    }
    return zones[0]?.id ?? null
  })

  // Inline catalogue search
  const [allParts, setAllParts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchCategory, setSearchCategory] = useState(null)
  const [showSearch, setShowSearch] = useState(false)

  // Read ?type= URL param on mount to skip straight to fault step
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const typeParam = urlParams.get('type')
    if (typeParam && FAULT_OPTIONS[typeParam]) {
      setJoineryType(typeParam)
      setStep('fault')
    }
  }, [])

  // Load full catalogue when parts step is reached
  useEffect(() => {
    if (step === 'parts') {
      getParts().then(setAllParts)
    }
  }, [step])

  // ── Navigation ────────────────────────────────────────────────────────────

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
      setShowSearch(false)
    } else {
      router.push('/')
    }
  }

  // ── Step transitions ──────────────────────────────────────────────────────

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
    setShowSearch(false)
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

  // ── Part state helpers ────────────────────────────────────────────────────

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

  // ── Commit current item ───────────────────────────────────────────────────

  function commitCurrentItem() {
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
      hourly_rate: hourlyRate,
      photos: beforePhotos,
    })

    setCurrentJob((prev) => prev ? { ...prev, labour_hours: labourHours, callout_fee: calloutFee } : prev)
  }

  function handleReviewAndSend() {
    commitCurrentItem()
    router.push(`/jobs/${params.id}/quote`)
  }

  function handleAddAnotherItem() {
    commitCurrentItem()
    setItemId(uuidv4())
    setBeforePhotos([])
    setStep('type')
    setJoineryType(null)
    setFaultValue(null)
    setFaultLabel('')
    setPartState({})
    setSearchQuery('')
    setSearchCategory(null)
    setShowSearch(false)
    // Clear the ?type= param from the URL so back navigation works correctly
    window.history.replaceState(null, '', `/jobs/${params.id}/items/add`)
  }

  // ── Relevance ranking ─────────────────────────────────────────────────────

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

  const selectedParts = Object.values(partState).filter((ps) => ps.selected)
  const topSuggestions = Object.values(partState)
    .map((ps) => ps.part)
    .sort((a, b) => {
      const scoreDiff = partRelevanceScore(b) - partRelevanceScore(a)
      if (scoreDiff !== 0) return scoreDiff
      return (b.sell_price || 0) - (a.sell_price || 0)
    })
    .slice(0, 3)

  const topSuggestionIds = new Set(topSuggestions.map((p) => p.id))

  const showSearchResults = showSearch || !!(searchQuery.trim() || searchCategory)
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

  // ── Live totals ───────────────────────────────────────────────────────────

  const currentItemPartsTotal = selectedParts.reduce((s, ps) => s + ps.part.sell_price * ps.qty, 0)
  const prevItemsPartsTotal = (currentJob?.items || []).reduce(
    (s, item) => s + (item.parts || []).reduce((ss, p) => ss + p.sell_price * p.qty, 0), 0
  )
  const allPartsTotal = currentItemPartsTotal + prevItemsPartsTotal
  const labourTotal = labourHours * hourlyRate
  const subtotal = allPartsTotal + labourTotal + calloutFee
  const gstAmount = calcGst(subtotal, GST_RATE)
  const grandTotal = subtotal + gstAmount

  // ── Titles ────────────────────────────────────────────────────────────────

  const faultOptions = joineryType ? FAULT_OPTIONS[joineryType] : []

  let pageTitle = 'Add item'
  let pageSubtitle = null
  let backLabel = 'Home'
  if (step === 'fault') {
    pageTitle = JOINERY_TYPE_LABELS[joineryType]
    pageSubtitle = "What's the fault?"
    backLabel = 'Type'
  }
  if (step === 'parts') {
    pageTitle = `${JOINERY_TYPE_LABELS[joineryType]}, ${faultLabel}`
    pageSubtitle = 'Suggested parts for this fault'
    backLabel = 'Fault'
  }

  return (
    <div className="min-h-dvh bg-aq-surface">
      <div className="max-w-[480px] mx-auto px-aq-lg pb-40">

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(JOINERY_TYPE_LABELS).map(([value]) => {
              const iconMap = {
                sliding_door:  <SlidingDoorIcon />,
                bifold_door:   <BifoldDoorIcon />,
                hinged_door:   <HingedDoorIcon />,
                window_ali:    <WindowAliIcon />,
                window_timber: <WindowTimberIcon />,
              }
              const descMap = {
                sliding_door:  'Patio, balcony, and stacker doors',
                bifold_door:   'Folding panel doors and wardrobes',
                hinged_door:   'Entry, interior, and French doors',
                window_ali:    'Casement, awning, and sliding windows',
                window_timber: 'Sash and timber-framed windows',
              }
              return (
                <TypePickerRow
                  key={value}
                  iconEl={iconMap[value]}
                  label={JOINERY_TYPE_LABELS[value]}
                  description={descMap[value]}
                  onClick={() => selectJoineryType(value)}
                />
              )
            })}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#E4EAE8' }} />
              <span style={{ fontSize: 12, color: '#8CA3A0' }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#E4EAE8' }} />
            </div>

            <TypePickerRow
              iconEl={<RubberIcon />}
              label="Rubber and weatherseal"
              description="Quick estimate across many windows"
              bgOverride="#FFFDF7"
              borderOverride="#F5E2B0"
              onClick={() => router.push(`/jobs/${params.id}/items/rubber`)}
            />
            <TypePickerRow
              iconEl={<CustomIcon />}
              label="Custom item"
              description="Bespoke work, describe it yourself"
              dashed
              onClick={() => router.push(`/jobs/${params.id}/items/custom`)}
            />
          </div>
        )}

        {/* ── Step 2: Fault selection ── */}
        {step === 'fault' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {faultOptions.map((option, idx) => {
              const { Icon, grey } = getFaultMeta(option.label)
              return (
                <FaultCard
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

        {/* ── Step 3: Parts + live quote ── */}
        {step === 'parts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {loadingParts ? (
              <p className="text-body text-aq-muted text-center py-aq-2xl">Loading...</p>
            ) : (
              <>
                {/* Added parts tray */}
                {selectedParts.length > 0 && (
                  <div style={{ background: '#E6F7F0', border: '1px solid #C5E8D5', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '10px 16px', borderBottom: '1px solid #C5E8D5' }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: '#22A67A', margin: 0 }}>Added</p>
                    </div>
                    {selectedParts.map((ps) => (
                      <div key={ps.part.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid #C5E8D5' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 15, fontWeight: 500, color: '#1F2D37', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ps.part.name}</p>
                          <p style={{ fontSize: 13, color: '#8CA3A0', margin: '2px 0 0' }}>x{ps.qty} @ {formatCurrency(ps.part.sell_price)}</p>
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 500, color: '#1F2D37', flexShrink: 0 }}>{formatCurrency(ps.part.sell_price * ps.qty)}</span>
                        <button
                          type="button"
                          onClick={() => togglePart(ps.part)}
                          style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D94444', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, flexShrink: 0 }}
                          aria-label={`Remove ${ps.part.name}`}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggested parts list */}
                {topSuggestions.length > 0 ? (
                  <div style={{ background: '#FFFFFF', border: '0.5px solid #E4EAE8', borderRadius: 12, overflow: 'hidden' }}>
                    {topSuggestions.map((part, idx) => {
                      const isAdded = partState[part.id]?.selected
                      return (
                        <div key={part.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: idx < topSuggestions.length - 1 ? '1px solid #E4EAE8' : 'none' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 15, fontWeight: 500, color: '#1F2D37', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{part.name}</p>
                            <p style={{ fontSize: 13, color: '#8CA3A0', margin: '2px 0 0' }}>{part.sku} · {formatCurrency(part.sell_price)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => togglePart(part)}
                            style={{
                              minHeight: 40, padding: '0 16px', fontSize: 14, fontWeight: 500,
                              borderRadius: 8, border: `1.5px solid ${isAdded ? '#22A67A' : '#22A67A'}`,
                              background: isAdded ? '#22A67A' : '#FFFFFF',
                              color: isAdded ? '#FFFFFF' : '#22A67A',
                              cursor: 'pointer', flexShrink: 0,
                              transition: 'background 150ms, color 150ms',
                            }}
                          >
                            {isAdded ? 'Added' : 'Add'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ background: '#FFFFFF', border: '0.5px solid #E4EAE8', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                    <p style={{ fontSize: 15, color: '#8CA3A0', margin: 0 }}>No suggested parts for this fault.</p>
                  </div>
                )}

                {/* Browse full catalogue */}
                <button
                  type="button"
                  onClick={() => setShowSearch((v) => !v)}
                  style={{ fontSize: 15, color: '#22A67A', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '0 2px', fontWeight: 500 }}
                >
                  {showSearch ? 'Hide catalogue search' : 'Browse full catalogue'}
                </button>

                {/* Inline catalogue search */}
                {showSearch && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search for a different part"
                      className="w-full bg-white border border-aq-border rounded-aq-md min-h-tap px-4 text-body text-aq-ink placeholder:text-aq-subtle focus:outline-none focus:border-aq-green transition-colors"
                    />
                    <div className="flex gap-aq-sm overflow-x-auto -mx-aq-lg px-aq-lg pb-1">
                      <button
                        type="button"
                        onClick={() => setSearchCategory(null)}
                        className={`shrink-0 min-h-tap px-aq-lg text-secondary font-medium rounded-aq-lg border transition-colors duration-150 ${
                          searchCategory === null ? 'border-aq-green bg-aq-green-tint text-aq-green' : 'border-aq-border text-aq-muted bg-white'
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
                            searchCategory === cat ? 'border-aq-green bg-aq-green-tint text-aq-green' : 'border-aq-border text-aq-muted bg-white'
                          }`}
                        >
                          {PART_CATEGORY_LABELS[cat]}
                        </button>
                      ))}
                    </div>
                    {searchResults.length === 0 && (searchQuery.trim() || searchCategory) ? (
                      <p className="text-secondary text-aq-muted text-center py-aq-md">No parts found.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {searchResults.map((part) => {
                          const isAdded = partState[part.id]?.selected
                          return (
                            <div key={part.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#FFFFFF', border: '0.5px solid #E4EAE8', borderRadius: 12 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 15, fontWeight: 500, color: '#1F2D37', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{part.name}</p>
                                <p style={{ fontSize: 13, color: '#8CA3A0', margin: '2px 0 0' }}>{part.sku} · {formatCurrency(part.sell_price)}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => togglePart(part)}
                                style={{
                                  minHeight: 40, padding: '0 16px', fontSize: 14, fontWeight: 500,
                                  borderRadius: 8, border: '1.5px solid #22A67A',
                                  background: isAdded ? '#22A67A' : '#FFFFFF',
                                  color: isAdded ? '#FFFFFF' : '#22A67A',
                                  cursor: 'pointer', flexShrink: 0,
                                  transition: 'background 150ms, color 150ms',
                                }}
                              >
                                {isAdded ? 'Added' : 'Add'}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Labour row */}
                <div style={{ background: '#FFFFFF', border: '0.5px solid #E4EAE8', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 500, color: '#1F2D37', margin: 0 }}>Labour</p>
                      <p style={{ fontSize: 13, color: '#8CA3A0', margin: '2px 0 0' }}>{formatCurrency(hourlyRate)}/hr</p>
                    </div>
                    <Stepper value={labourHours} onChange={setLabourHours} min={0.5} step={0.5} />
                  </div>
                </div>

                {/* Callout row */}
                <div style={{ background: '#FFFFFF', border: '0.5px solid #E4EAE8', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: zones.length > 0 ? 12 : 0 }}>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 500, color: '#1F2D37', margin: 0 }}>Callout</p>
                      <p style={{ fontSize: 13, color: '#8CA3A0', margin: '2px 0 0' }}>
                        {selectedZoneId ? (zones.find((z) => z.id === selectedZoneId)?.name || 'Custom') : (zones.length > 0 ? 'Select zone' : 'Manual')}
                      </p>
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 500, color: '#1F2D37', flexShrink: 0 }}>{formatCurrency(calloutFee)}</span>
                  </div>
                  {zones.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {zones.map((zone) => (
                        <button
                          key={zone.id}
                          type="button"
                          onClick={() => { setSelectedZoneId(zone.id); setCalloutFee(zone.fee) }}
                          style={{
                            minHeight: 40, padding: '0 14px', fontSize: 14, fontWeight: 500,
                            borderRadius: 8, border: `1.5px solid ${selectedZoneId === zone.id ? '#22A67A' : '#E4EAE8'}`,
                            background: selectedZoneId === zone.id ? '#E6F7F0' : '#FFFFFF',
                            color: selectedZoneId === zone.id ? '#22A67A' : '#4A5B68',
                            cursor: 'pointer', transition: 'background 150ms, border-color 150ms',
                          }}
                        >
                          {zone.name} {formatCurrency(zone.fee)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Live total bar */}
                <div style={{ background: '#1F2D37', borderRadius: 12, padding: 16 }}>
                  <p style={{ fontSize: 13, color: '#8CA3A0', margin: '0 0 8px', lineHeight: 1.5 }}>
                    Parts {formatCurrency(allPartsTotal)} + Labour {formatCurrency(labourTotal)} + Callout {formatCurrency(calloutFee)}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <p style={{ fontSize: 15, color: '#FFFFFF', margin: 0 }}>Total (incl. GST)</p>
                    <p style={{ fontSize: 18, fontWeight: 600, color: '#FFFFFF', margin: 0 }}>{formatCurrency(grandTotal)}</p>
                  </div>
                </div>

                {/* Before photos */}
                <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
                  <PhotoCapture
                    label="Before photos"
                    buttonLabel="Add before photo"
                    photos={beforePhotos}
                    onChange={setBeforePhotos}
                    uploadOpts={{ jobId: currentJob?.id, itemId, type: 'before' }}
                  />
                </div>
              </>
            )}
          </div>
        )}

      </div>

      {/* ── Fixed bottom actions (parts step only) ── */}
      {step === 'parts' && !loadingParts && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-aq-border px-aq-lg py-aq-md">
          <div className="max-w-[480px] mx-auto flex flex-col gap-aq-sm">
            <Button variant="primary" fullWidth onClick={handleReviewAndSend}>
              Review and send
            </Button>
            <Button variant="secondary" fullWidth onClick={handleAddAnotherItem}>
              Add another item
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Inline icon components for type step ──────────────────────────────────────

function TypePickerRow({ iconEl, label, description, bgOverride, borderOverride, dashed, onClick }) {
  function pressDown(e) {
    e.currentTarget.style.transform = 'translateY(2px)'
    e.currentTarget.style.borderBottomWidth = '1px'
  }
  function pressUp(e) {
    e.currentTarget.style.transform = ''
    e.currentTarget.style.borderBottomWidth = '3px'
  }
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={pressDown}
      onPointerUp={pressUp}
      onPointerLeave={pressUp}
      style={{
        background: bgOverride || '#FFFFFF',
        border: dashed ? '1.5px dashed #E4EAE8' : '0.5px solid #E4EAE8',
        borderBottom: `3px solid ${borderOverride || '#C5E8D5'}`,
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        width: '100%',
        minHeight: 72,
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'transform 80ms, border-bottom-width 80ms',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {iconEl}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#1F2D37', margin: 0, lineHeight: 1.3 }}>{label}</p>
        {description && <p style={{ fontSize: 12, color: '#8CA3A0', margin: '3px 0 0', lineHeight: 1.4 }}>{description}</p>}
      </div>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8CA3A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  )
}

function SlidingDoorIcon() {
  return (
    <div style={{ width: 56, height: 56, background: '#E6F7F0', borderRadius: 12, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 22, height: 34, background: '#22A67A', opacity: 0.35, borderRadius: 2, left: 9, top: 11 }} />
      <div style={{ position: 'absolute', width: 22, height: 34, background: '#22A67A', borderRadius: 2, right: 9, top: 11 }}>
        <div style={{ position: 'absolute', width: 3, height: 10, background: '#E6F7F0', borderRadius: 2, right: 4, top: 12 }} />
      </div>
    </div>
  )
}
function BifoldDoorIcon() {
  return (
    <div style={{ width: 56, height: 56, background: '#E6F7F0', borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <div style={{ width: 13, height: 32, background: '#22A67A', borderRadius: 2, transform: 'skewX(-6deg)' }} />
      <div style={{ width: 13, height: 32, background: '#22A67A', borderRadius: 2 }} />
      <div style={{ width: 13, height: 32, background: '#22A67A', borderRadius: 2, transform: 'skewX(6deg)' }} />
    </div>
  )
}
function HingedDoorIcon() {
  return (
    <div style={{ width: 56, height: 56, background: '#E6F7F0', borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 30, height: 38 }}>
        <div style={{ width: '100%', height: '100%', background: '#22A67A', borderRadius: '2px 7px 7px 2px', position: 'relative' }}>
          <div style={{ position: 'absolute', width: 6, height: 6, background: '#E6F7F0', borderRadius: '50%', right: 5, top: '50%', transform: 'translateY(-50%)' }} />
        </div>
        <div style={{ position: 'absolute', width: 5, height: 5, background: '#147A5A', borderRadius: '50%', left: -2, top: 4 }} />
        <div style={{ position: 'absolute', width: 5, height: 5, background: '#147A5A', borderRadius: '50%', left: -2, bottom: 4 }} />
      </div>
    </div>
  )
}
function WindowAliIcon() {
  return (
    <div style={{ width: 56, height: 56, background: '#E6F7F0', borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        {[0, 1, 2, 3].map((i) => <div key={i} style={{ width: 18, height: 18, background: '#22A67A', borderRadius: 3 }} />)}
      </div>
    </div>
  )
}
function WindowTimberIcon() {
  return (
    <div style={{ width: 56, height: 56, background: '#FEF7E6', borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        {[0, 1, 2, 3].map((i) => <div key={i} style={{ width: 18, height: 18, background: '#D9A03A', borderRadius: 3 }} />)}
      </div>
    </div>
  )
}
function RubberIcon() {
  return (
    <div style={{ width: 56, height: 56, background: '#FEF7E6', borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 38, height: 12, background: '#F0B542', borderRadius: 4 }}>
        <div style={{ position: 'absolute', top: '50%', left: 5, right: 5, height: 2, transform: 'translateY(-50%)', backgroundImage: 'repeating-linear-gradient(to right, #FFFFFF 0, #FFFFFF 5px, transparent 5px, transparent 9px)', borderRadius: 1 }} />
      </div>
    </div>
  )
}
function CustomIcon() {
  return (
    <div style={{ width: 56, height: 56, background: '#F6F8F7', borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 32, height: 36, background: '#8CA3A0', borderRadius: 4 }}>
        <div style={{ position: 'absolute', height: 2, left: 6, right: 6, top: 9, background: '#F6F8F7', borderRadius: 1 }} />
        <div style={{ position: 'absolute', height: 2, left: 6, right: 6, top: 17, background: '#F6F8F7', borderRadius: 1 }} />
        <div style={{ position: 'absolute', height: 2, left: 6, right: 14, top: 25, background: '#F6F8F7', borderRadius: 1 }} />
      </div>
    </div>
  )
}
