'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { useJob } from '@/lib/job-context'
import { useSettings } from '@/lib/settings-context'
import { getParts } from '@/lib/db'
import PhotoCapture from '@/components/PhotoCapture'
import { PART_CATEGORY } from '@/lib/constants'
import { formatCurrency } from '@/lib/pricing'
import Button from '@/components/Button'
import BackButton from '@/components/BackButton'
import Stepper from '@/components/Stepper'

function XIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

function RubberPickerOverlay({ onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [parts, setParts] = useState([])

  useEffect(() => {
    getParts().then((all) => {
      setParts(all.filter((p) => p.active && p.category === PART_CATEGORY.SEALS))
    })
  }, [])

  const filtered = query.trim()
    ? parts.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          (p.sku || '').toLowerCase().includes(query.toLowerCase())
      )
    : parts

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex items-center gap-aq-sm px-aq-lg py-aq-md border-b border-aq-border">
        <button
          type="button"
          onClick={onClose}
          className="min-h-tap min-w-[48px] flex items-center justify-center text-aq-ink hover:text-aq-green transition-colors"
          aria-label="Close"
        >
          <XIcon size={20} />
        </button>
        <h2 className="text-section font-medium text-aq-ink">Select rubber type</h2>
      </div>
      <div className="px-aq-lg py-aq-md border-b border-aq-border">
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search seals and weatherstrips"
          className="w-full bg-white border border-aq-border rounded-aq-md min-h-tap px-4 text-body text-aq-ink placeholder:text-aq-subtle focus:outline-none focus:border-aq-green transition-colors"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-aq-lg py-aq-md">
        {filtered.length === 0 ? (
          <p className="text-secondary text-aq-muted text-center py-aq-2xl">No seals found.</p>
        ) : (
          <div className="flex flex-col gap-[10px]">
            {filtered.map((part) => (
              <button
                key={part.id}
                type="button"
                onClick={() => onSelect(part)}
                className="w-full bg-white border border-aq-border rounded-aq-xl p-aq-lg text-left hover:bg-aq-surface active:bg-aq-border transition-colors duration-150"
              >
                <div className="flex justify-between items-start gap-aq-sm">
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-medium text-aq-ink leading-snug">{part.name}</p>
                    <p className="text-caption text-aq-muted">{part.sku}</p>
                  </div>
                  <span className="text-body font-medium text-aq-green shrink-0">
                    {formatCurrency(part.sell_price)}/{part.unit || 'm'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function RubberEstimatorPage() {
  const params = useParams()
  const router = useRouter()
  const { currentJob, addItem, setCurrentJob } = useJob()
  const { settings } = useSettings()

  const wastePct = settings.rubber_waste_pct ?? 10
  const bands = settings.window_size_bands || []
  const hourlyRate = settings.hourly_labour_rate || 85

  const [itemId] = useState(() => uuidv4())
  const [beforePhotos, setBeforePhotos] = useState([])

  const [selectedRubber, setSelectedRubber] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const [mode, setMode] = useState('band') // band | dims
  const [selectedBandIdx, setSelectedBandIdx] = useState(0)
  const [bandCount, setBandCount] = useState(1)
  const [dimWidth, setDimWidth] = useState(1000)
  const [dimHeight, setDimHeight] = useState(1200)
  const [dimCount, setDimCount] = useState(1)

  // Added groups: [{ id, label, count, perimeter_m, labour_min }]
  const [groups, setGroups] = useState([])

  function handleSelectRubber(part) {
    setSelectedRubber(part)
    setPickerOpen(false)
  }

  function handleAddGroup() {
    if (mode === 'band') {
      const band = bands[selectedBandIdx]
      if (!band) return
      setGroups((prev) => [
        ...prev,
        {
          id: uuidv4(),
          label: band.name,
          count: bandCount,
          perimeter_m: band.perimeter_m,
          labour_min: band.labour_min,
        },
      ])
    } else {
      const perimeterM = (2 * (dimWidth + dimHeight)) / 1000
      setGroups((prev) => [
        ...prev,
        {
          id: uuidv4(),
          label: `${dimWidth} x ${dimHeight}mm`,
          count: dimCount,
          perimeter_m: parseFloat(perimeterM.toFixed(2)),
          labour_min: 20,
        },
      ])
    }
  }

  function removeGroup(id) {
    setGroups((prev) => prev.filter((g) => g.id !== id))
  }

  const totals = useMemo(() => {
    const totalWindows = groups.reduce((s, g) => s + g.count, 0)
    const rawMetres = groups.reduce((s, g) => s + g.count * g.perimeter_m, 0)
    const orderMetres = Math.ceil(rawMetres * (1 + wastePct / 100))
    const partsCost = orderMetres * (selectedRubber?.sell_price || 0)
    const totalLabourMin = groups.reduce((s, g) => s + g.count * g.labour_min, 0)
    const labourHours = parseFloat((totalLabourMin / 60).toFixed(2))
    const labourCost = labourHours * hourlyRate
    const lineTotal = partsCost + labourCost
    return { totalWindows, rawMetres, orderMetres, partsCost, labourHours, labourCost, lineTotal }
  }, [groups, wastePct, selectedRubber, hourlyRate])

  function handleAddToJob() {
    const { totalWindows, orderMetres, labourHours } = totals

    // Customer-facing: window count only, no metres, no product name
    const description = `Window rubber replacement - ${totalWindows} window${totalWindows !== 1 ? 's' : ''}`

    // Operator-only: full detail including rubber product and metreage
    const windowBreakdown = groups
      .map((g) => `${g.count} x ${g.label} = ${(g.count * g.perimeter_m).toFixed(1)}m`)
      .join(', ')
    const internalNotes = [
      selectedRubber ? `Rubber: ${selectedRubber.name} (${selectedRubber.sku})` : null,
      `${orderMetres}m to order (+${wastePct}% waste from ${totals.rawMetres.toFixed(1)}m raw)`,
      windowBreakdown,
    ].filter(Boolean).join('\n')

    addItem({
      id: itemId,
      type: 'custom',
      description,
      internal_notes: internalNotes,
      photos: beforePhotos,
      parts: selectedRubber
        ? [
            {
              part_id: selectedRubber.id,
              // Generic name for customer-facing output — real product in internal_notes
              name: 'Weatherseal materials',
              sku: selectedRubber.sku,
              sell_price: selectedRubber.sell_price,
              cost_price: selectedRubber.cost_price,
              qty: orderMetres,
              unit: selectedRubber.unit || 'm',
              supplier: selectedRubber.supplier,
              supplier_code: selectedRubber.supplier_code,
            },
          ]
        : [],
      labour_hours: labourHours,
      hourly_rate: hourlyRate,
    })

    setCurrentJob((prev) => ({
      ...prev,
      labour_hours: (prev.labour_hours || 0) + labourHours,
    }))

    router.push(`/jobs/${params.id}/items`)
  }

  const canAdd = groups.length > 0 && selectedRubber

  return (
    <>
      {pickerOpen && (
        <RubberPickerOverlay
          onSelect={handleSelectRubber}
          onClose={() => setPickerOpen(false)}
        />
      )}

      <div className="min-h-dvh bg-aq-surface">
        <div className="max-w-[480px] mx-auto px-aq-lg pb-40">

          <div className="flex items-center gap-aq-sm py-aq-xl">
            <BackButton
              onClick={() => router.push(`/jobs/${params.id}/items/add`)}
              label="Add item"
            />
            <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm">
              Rubber and weatherseal estimate
            </h1>
          </div>

          {/* Step 1: Add windows */}
          <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg mb-aq-lg">
            <p className="text-body font-medium text-aq-ink mb-aq-md">Add windows</p>

            {/* Mode toggle */}
            <div className="flex gap-aq-sm mb-aq-lg">
              {['band', 'dims'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`min-h-tap flex-1 text-secondary font-medium rounded-aq-lg border transition-colors duration-150 ${
                    mode === m
                      ? 'border-aq-green bg-aq-green-tint text-aq-green'
                      : 'border-aq-border text-aq-muted bg-white'
                  }`}
                >
                  {m === 'band' ? 'By size' : 'By dimensions'}
                </button>
              ))}
            </div>

            {mode === 'band' ? (
              <div className="flex flex-col gap-aq-md">
                <div className="flex flex-wrap gap-aq-sm">
                  {bands.map((band, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedBandIdx(idx)}
                      className={`min-h-tap px-aq-lg text-secondary font-medium rounded-aq-lg border transition-colors duration-150 ${
                        selectedBandIdx === idx
                          ? 'border-aq-green bg-aq-green-tint text-aq-green'
                          : 'border-aq-border text-aq-muted bg-white'
                      }`}
                    >
                      {band.name}
                    </button>
                  ))}
                </div>
                {bands[selectedBandIdx] && (
                  <p className="text-caption text-aq-muted">
                    {bands[selectedBandIdx].perimeter_m}m perimeter · {bands[selectedBandIdx].labour_min} min each
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <Stepper value={bandCount} onChange={setBandCount} min={1} max={99} label="Windows" />
                  <Button variant="primary" onClick={handleAddGroup} disabled={!bands[selectedBandIdx]}>
                    Add
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-aq-md">
                <div className="flex gap-aq-sm">
                  <div className="flex-1">
                    <p className="text-secondary text-aq-muted mb-aq-sm">Width (mm)</p>
                    <Stepper value={dimWidth} onChange={setDimWidth} min={100} max={5000} step={100} />
                  </div>
                  <div className="flex-1">
                    <p className="text-secondary text-aq-muted mb-aq-sm">Height (mm)</p>
                    <Stepper value={dimHeight} onChange={setDimHeight} min={100} max={5000} step={100} />
                  </div>
                </div>
                <p className="text-caption text-aq-muted">
                  Perimeter: {((2 * (dimWidth + dimHeight)) / 1000).toFixed(2)}m
                </p>
                <div className="flex items-center justify-between">
                  <Stepper value={dimCount} onChange={setDimCount} min={1} max={99} label="Windows" />
                  <Button variant="primary" onClick={handleAddGroup}>
                    Add
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Groups list */}
          {groups.length > 0 && (
            <div className="flex flex-col gap-[10px] mb-aq-lg">
              {groups.map((g) => (
                <div
                  key={g.id}
                  className="bg-white border border-aq-border rounded-aq-xl px-aq-lg py-aq-md flex items-center gap-aq-md"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-secondary font-medium text-aq-ink">
                      {g.count} x {g.label} = {(g.count * g.perimeter_m).toFixed(1)}m
                    </p>
                    <p className="text-caption text-aq-muted">{g.labour_min} min each</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeGroup(g.id)}
                    className="min-h-tap min-w-[48px] flex items-center justify-center text-aq-error hover:bg-aq-error-tint rounded-aq-md transition-colors"
                    aria-label={`Remove ${g.label}`}
                  >
                    <XIcon />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Running totals — visible as soon as windows are added */}
          {groups.length > 0 && (
            <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg mb-aq-lg">
              <p className="text-body font-medium text-aq-ink mb-aq-md">Estimate summary</p>
              <div className="flex flex-col gap-aq-sm">
                <div className="flex justify-between">
                  <span className="text-secondary text-aq-muted">Windows</span>
                  <span className="text-secondary text-aq-ink">{totals.totalWindows}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary text-aq-muted">Raw metres</span>
                  <span className="text-secondary text-aq-ink">{totals.rawMetres.toFixed(1)}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary text-aq-muted">Order metres (+{wastePct}% waste)</span>
                  <span className="text-secondary font-medium text-aq-ink">{totals.orderMetres}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary text-aq-muted">Labour</span>
                  <span className="text-secondary text-aq-ink">
                    {totals.labourHours.toFixed(1)} hr ({formatCurrency(totals.labourCost)})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary text-aq-muted">Parts</span>
                  <span className={`text-secondary ${selectedRubber ? 'text-aq-ink' : 'text-aq-subtle'}`}>
                    {selectedRubber ? formatCurrency(totals.partsCost) : 'Select rubber type below'}
                  </span>
                </div>
                <div className="h-px bg-aq-border my-aq-xs" />
                <div className="flex justify-between">
                  <span className="text-body font-medium text-aq-ink">Line total</span>
                  <span className={`text-body font-medium ${selectedRubber ? 'text-aq-ink' : 'text-aq-subtle'}`}>
                    {selectedRubber ? formatCurrency(totals.lineTotal) : '--'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Before photos */}
          <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg mb-aq-lg">
            <PhotoCapture
              label="Before photos"
              buttonLabel="Add before photo"
              photos={beforePhotos}
              onChange={setBeforePhotos}
              uploadOpts={{ jobId: currentJob?.id, itemId, type: 'before' }}
            />
          </div>

          {/* Step 2: Rubber type — chosen last, after counting windows */}
          <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg mb-aq-lg">
            <p className="text-body font-medium text-aq-ink mb-aq-md">Rubber type</p>
            {selectedRubber ? (
              <div className="flex items-center justify-between gap-aq-md">
                <div className="flex-1 min-w-0">
                  <p className="text-secondary font-medium text-aq-ink truncate">{selectedRubber.name}</p>
                  <p className="text-caption text-aq-muted">
                    {formatCurrency(selectedRubber.sell_price)}/{selectedRubber.unit || 'm'}
                  </p>
                </div>
                <Button variant="secondary" onClick={() => setPickerOpen(true)}>Change</Button>
              </div>
            ) : (
              <Button variant="secondary" fullWidth onClick={() => setPickerOpen(true)}>
                Select rubber type
              </Button>
            )}
          </div>

        </div>

        {/* Fixed bottom button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-aq-border px-aq-lg py-aq-md">
          <div className="max-w-[480px] mx-auto">
            <Button
              variant="primary"
              fullWidth
              disabled={!canAdd}
              onClick={handleAddToJob}
            >
              Add to job
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
