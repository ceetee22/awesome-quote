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

  // Model B: one count per band index
  const [bandCounts, setBandCounts] = useState({})

  // Odd-sized windows
  const [oddGroups, setOddGroups] = useState([])
  const [showOddForm, setShowOddForm] = useState(false)
  const [oddWidth, setOddWidth] = useState(1000)
  const [oddHeight, setOddHeight] = useState(1200)
  const [oddCount, setOddCount] = useState(1)

  function setBandCount(idx, val) {
    setBandCounts((prev) => ({ ...prev, [idx]: Math.max(0, val) }))
  }

  function handleAddOddGroup() {
    const perimeterM = parseFloat(((2 * (oddWidth + oddHeight)) / 1000).toFixed(2))
    setOddGroups((prev) => [
      ...prev,
      {
        id: uuidv4(),
        label: `${oddWidth} × ${oddHeight}mm`,
        count: oddCount,
        perimeter_m: perimeterM,
        labour_min: 20,
      },
    ])
    setShowOddForm(false)
    setOddCount(1)
  }

  function removeOddGroup(id) {
    setOddGroups((prev) => prev.filter((g) => g.id !== id))
  }

  const totals = useMemo(() => {
    const bandWindows = bands.reduce((s, band, idx) => s + (bandCounts[idx] || 0), 0)
    const bandMetres  = bands.reduce((s, band, idx) => s + (bandCounts[idx] || 0) * band.perimeter_m, 0)
    const bandLabour  = bands.reduce((s, band, idx) => s + (bandCounts[idx] || 0) * band.labour_min, 0)

    const oddWindows = oddGroups.reduce((s, g) => s + g.count, 0)
    const oddMetres  = oddGroups.reduce((s, g) => s + g.count * g.perimeter_m, 0)
    const oddLabour  = oddGroups.reduce((s, g) => s + g.count * g.labour_min, 0)

    const totalWindows  = bandWindows + oddWindows
    const rawMetres     = bandMetres + oddMetres
    const orderMetres   = Math.ceil(rawMetres * (1 + wastePct / 100))
    const partsCost     = orderMetres * (selectedRubber?.sell_price || 0)
    const totalLabourMin = bandLabour + oddLabour
    const labourHours   = parseFloat((totalLabourMin / 60).toFixed(2))
    const labourCost    = labourHours * hourlyRate
    const lineTotal     = partsCost + labourCost
    return { totalWindows, rawMetres, orderMetres, partsCost, labourHours, labourCost, lineTotal }
  }, [bands, bandCounts, oddGroups, wastePct, selectedRubber, hourlyRate])

  function handleAddToJob() {
    const { totalWindows, orderMetres, labourHours } = totals

    const description = `Window rubber replacement - ${totalWindows} window${totalWindows !== 1 ? 's' : ''}`

    const bandBreakdown = bands
      .map((band, idx) => {
        const count = bandCounts[idx] || 0
        if (count === 0) return null
        return `${count} x ${band.name} = ${(count * band.perimeter_m).toFixed(1)}m`
      })
      .filter(Boolean)
      .join(', ')

    const oddBreakdown = oddGroups
      .map((g) => `${g.count} x ${g.label} = ${(g.count * g.perimeter_m).toFixed(1)}m`)
      .join(', ')

    const windowBreakdown = [bandBreakdown, oddBreakdown].filter(Boolean).join(', ')

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

  const canAdd = totals.totalWindows > 0 && selectedRubber

  return (
    <>
      {pickerOpen && (
        <RubberPickerOverlay
          onSelect={(part) => { setSelectedRubber(part); setPickerOpen(false) }}
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

          {/* Add windows card */}
          <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg mb-aq-lg">
            <p className="text-body font-medium text-aq-ink mb-aq-md">Add windows</p>

            {/* Band rows */}
            <div className="flex flex-col">
              {bands.map((band, idx) => {
                const count = bandCounts[idx] || 0
                const active = count > 0
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-aq-md py-[10px] ${idx > 0 ? 'border-t border-aq-border' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-secondary font-medium transition-colors ${active ? 'text-aq-ink' : 'text-aq-muted'}`}>
                        {band.name}
                      </p>
                      <p className="text-caption text-aq-muted">{band.perimeter_m}m perimeter per window</p>
                    </div>
                    <div className="flex items-center gap-[2px] shrink-0">
                      <button
                        type="button"
                        onClick={() => setBandCount(idx, count - 1)}
                        disabled={count === 0}
                        aria-label={`Decrease ${band.name}`}
                        className="w-10 h-10 flex items-center justify-center rounded-aq-md border border-aq-border bg-white text-aq-muted text-lg leading-none disabled:opacity-30 hover:bg-aq-surface active:bg-aq-border transition-colors"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-secondary font-medium text-aq-ink select-none">
                        {count}
                      </span>
                      <button
                        type="button"
                        onClick={() => setBandCount(idx, count + 1)}
                        aria-label={`Increase ${band.name}`}
                        className={`w-10 h-10 flex items-center justify-center rounded-aq-md border text-lg leading-none transition-colors ${
                          active
                            ? 'bg-aq-green-tint border-aq-green-tint-border text-aq-green'
                            : 'bg-white border-aq-border text-aq-muted hover:bg-aq-surface active:bg-aq-border'
                        }`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Odd groups list */}
            {oddGroups.length > 0 && (
              <div className="mt-aq-md border-t border-aq-border pt-aq-md flex flex-col gap-[10px]">
                {oddGroups.map((g) => (
                  <div key={g.id} className="flex items-center gap-aq-md">
                    <div className="flex-1 min-w-0">
                      <p className="text-secondary font-medium text-aq-ink">
                        {g.count} x {g.label} = {(g.count * g.perimeter_m).toFixed(1)}m
                      </p>
                      <p className="text-caption text-aq-muted">{g.labour_min} min each</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOddGroup(g.id)}
                      className="w-10 h-10 flex items-center justify-center text-aq-error rounded-aq-md hover:bg-red-50 transition-colors"
                      aria-label={`Remove ${g.label}`}
                    >
                      <XIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Odd-sized window toggle */}
            <div className="mt-aq-md">
              {!showOddForm ? (
                <button
                  type="button"
                  onClick={() => setShowOddForm(true)}
                  className="w-full min-h-tap flex items-center justify-center gap-aq-sm border-2 border-dashed border-aq-border rounded-aq-xl text-secondary font-medium text-aq-muted hover:border-aq-green hover:text-aq-green transition-colors duration-150"
                >
                  <span>+</span>
                  <span>Add an odd-sized window</span>
                </button>
              ) : (
                <div className="border-t border-aq-border pt-aq-md">
                  <p className="text-secondary font-medium text-aq-ink mb-aq-md">Odd-sized window</p>
                  <div className="flex gap-aq-sm mb-aq-sm">
                    <div className="flex-1">
                      <p className="text-caption text-aq-muted mb-aq-xs">Width (mm)</p>
                      <Stepper value={oddWidth} onChange={setOddWidth} min={100} max={5000} step={100} />
                    </div>
                    <div className="flex-1">
                      <p className="text-caption text-aq-muted mb-aq-xs">Height (mm)</p>
                      <Stepper value={oddHeight} onChange={setOddHeight} min={100} max={5000} step={100} />
                    </div>
                  </div>
                  <p className="text-caption text-aq-muted mb-aq-md">
                    Perimeter: {((2 * (oddWidth + oddHeight)) / 1000).toFixed(2)}m
                  </p>
                  <div className="mb-aq-md">
                    <Stepper value={oddCount} onChange={setOddCount} min={1} max={99} label="Windows" />
                  </div>
                  <div className="flex gap-aq-sm">
                    <Button variant="secondary" onClick={() => setShowOddForm(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleAddOddGroup}>Add</Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Running totals */}
          {totals.totalWindows > 0 && (
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

          {/* Rubber type — chosen last, after counting windows */}
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
