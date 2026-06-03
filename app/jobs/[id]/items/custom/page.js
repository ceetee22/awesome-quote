'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { useJob } from '@/lib/job-context'
import { getParts } from '@/lib/db'
import {
  JOINERY_TYPE_LABELS,
  FITS_VALUES,
  FIXES_VALUES,
  FIXES_LABELS,
} from '@/lib/constants'
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

const inputClass =
  'w-full bg-white border border-aq-border rounded-aq-md min-h-tap px-4 text-body text-aq-ink placeholder:text-aq-subtle focus:outline-none focus:border-aq-green transition-colors duration-150'

const textareaClass =
  'w-full bg-white border border-aq-border rounded-aq-md px-4 py-3 text-body text-aq-ink placeholder:text-aq-subtle focus:outline-none focus:border-aq-green transition-colors duration-150 resize-none'

// Catalogue search overlay — full screen, white bg
function CatalogueSearchOverlay({ onAdd, onClose }) {
  const [query, setQuery] = useState('')
  const [allParts, setAllParts] = useState([])

  useEffect(() => {
    getParts().then(setAllParts)
  }, [])

  const filtered = query.trim()
    ? allParts.filter(
        (p) =>
          p.active &&
          (p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.sku.toLowerCase().includes(query.toLowerCase()))
      )
    : allParts.filter((p) => p.active)

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Overlay header */}
      <div className="flex items-center gap-aq-sm px-aq-lg py-aq-md border-b border-aq-border">
        <button
          type="button"
          onClick={onClose}
          className="min-h-tap min-w-[48px] flex items-center justify-center text-aq-ink hover:text-aq-green transition-colors"
          aria-label="Close search"
        >
          <XIcon size={20} />
        </button>
        <h2 className="text-section font-medium text-aq-ink">Search catalogue</h2>
      </div>

      {/* Search input */}
      <div className="px-aq-lg py-aq-md border-b border-aq-border">
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or SKU"
          className={inputClass}
        />
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-aq-lg py-aq-md">
        {filtered.length === 0 ? (
          <p className="text-secondary text-aq-muted text-center py-aq-2xl">
            No parts match your search.
          </p>
        ) : (
          <div className="flex flex-col gap-[10px]">
            {filtered.map((part) => (
              <button
                key={part.id}
                type="button"
                onClick={() => onAdd(part)}
                className="w-full bg-white border border-aq-border rounded-aq-xl p-aq-lg text-left hover:bg-aq-surface active:bg-aq-border transition-colors duration-150"
              >
                <div className="flex justify-between items-start gap-aq-sm">
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-medium text-aq-ink leading-snug">
                      {part.name}
                    </p>
                    <p className="text-caption text-aq-muted">{part.sku}</p>
                  </div>
                  <span className="text-body font-medium text-aq-green shrink-0">
                    {formatCurrency(part.sell_price)}
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

// Toggle pill used for fits/fixes tag selection
function TagPill({ label, selected, onToggle, colour = 'green' }) {
  const styles =
    colour === 'gold'
      ? selected
        ? 'border-aq-gold bg-aq-gold-tint text-aq-ink'
        : 'border-aq-border text-aq-muted bg-white hover:bg-aq-surface'
      : selected
        ? 'border-aq-green bg-aq-green-tint text-aq-green'
        : 'border-aq-border text-aq-muted bg-white hover:bg-aq-surface'

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`min-h-tap px-aq-md text-secondary font-medium rounded-aq-lg border transition-colors duration-150 ${styles}`}
    >
      {label}
    </button>
  )
}

export default function CustomItemPage() {
  const params = useParams()
  const router = useRouter()
  const { addItem } = useJob()

  const [description, setDescription] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [parts, setParts] = useState([])
  const [labourHours, setLabourHours] = useState(0)
  const [saveToCalogue, setSaveToCalogue] = useState(true)
  const [selectedFits, setSelectedFits] = useState([])
  const [selectedFixes, setSelectedFixes] = useState([])

  // Catalogue search overlay
  const [searchOpen, setSearchOpen] = useState(false)

  // Manual part inline form
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualPrice, setManualPrice] = useState('')

  function addCataloguePart(part) {
    setParts((prev) => [
      ...prev,
      {
        _key: uuidv4(),
        part_id: part.id,
        name: part.name,
        sku: part.sku,
        sell_price: part.sell_price,
        cost_price: part.cost_price,
        qty: 1,
        unit: part.unit,
        supplier: part.supplier,
        supplier_code: part.supplier_code,
      },
    ])
    setSearchOpen(false)
  }

  function addManualPart() {
    if (!manualName.trim()) return
    setParts((prev) => [
      ...prev,
      {
        _key: uuidv4(),
        part_id: null,
        name: manualName.trim(),
        sku: '',
        sell_price: parseFloat(manualPrice) || 0,
        cost_price: parseFloat(manualPrice) || 0,
        qty: 1,
        unit: 'each',
      },
    ])
    setManualName('')
    setManualPrice('')
    setShowManualForm(false)
  }

  function setPartQty(key, qty) {
    setParts((prev) =>
      prev.map((p) => (p._key === key ? { ...p, qty } : p))
    )
  }

  function removePart(key) {
    setParts((prev) => prev.filter((p) => p._key !== key))
  }

  function toggleFit(value) {
    setSelectedFits((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  function toggleFix(value) {
    setSelectedFixes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  function handleAddToJob() {
    addItem({
      type: 'custom',
      description: description.trim(),
      internal_notes: internalNotes.trim(),
      parts: parts.map(({ _key, ...rest }) => rest),
      labour_hours: labourHours,
      hourly_rate: 95,
      save_to_catalogue: saveToCalogue,
      fits: selectedFits,
      fixes: selectedFixes,
    })
    router.push(`/jobs/${params.id}/items`)
  }

  const canAdd = description.trim().length > 0 || parts.length > 0

  return (
    <>
      {searchOpen && (
        <CatalogueSearchOverlay
          onAdd={addCataloguePart}
          onClose={() => setSearchOpen(false)}
        />
      )}

      <div className="min-h-dvh bg-aq-surface">
        <div className="max-w-[480px] mx-auto px-aq-lg pb-[88px]">

          {/* Header */}
          <div className="flex items-center gap-aq-sm py-aq-xl">
            <BackButton onClick={() => router.push(`/jobs/${params.id}/items`)} label="Items" />
            <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm">Custom item</h1>
          </div>

          <div className="flex flex-col gap-aq-lg">

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-secondary text-aq-muted mb-aq-sm"
              >
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the work"
                className={textareaClass}
              />
            </div>

            {/* Internal notes */}
            <div>
              <label
                htmlFor="internal_notes"
                className="block text-secondary text-aq-subtle mb-aq-sm"
              >
                Internal notes (not shown on quote)
              </label>
              <textarea
                id="internal_notes"
                rows={2}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Notes for yourself only"
                className={textareaClass}
              />
            </div>

            {/* Parts section */}
            <div>
              <p className="text-body font-medium text-aq-ink mb-aq-md">Parts</p>

              {/* Added parts list */}
              {parts.length > 0 && (
                <div className="flex flex-col gap-[10px] mb-aq-md">
                  {parts.map((p) => (
                    <div
                      key={p._key}
                      className="bg-white border border-aq-border rounded-aq-xl p-aq-lg flex items-center gap-aq-md"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-secondary font-medium text-aq-ink truncate">
                          {p.name}
                        </p>
                        <p className="text-caption text-aq-subtle">
                          {formatCurrency(p.sell_price)}/{p.unit}
                        </p>
                      </div>
                      <Stepper
                        value={p.qty}
                        onChange={(v) => setPartQty(p._key, v)}
                        min={1}
                        max={20}
                      />
                      <button
                        type="button"
                        onClick={() => removePart(p._key)}
                        className="min-h-tap min-w-[48px] flex items-center justify-center text-aq-error hover:bg-aq-error-tint rounded-aq-md transition-colors"
                        aria-label={`Remove ${p.name}`}
                      >
                        <XIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add parts buttons */}
              <div className="flex flex-col gap-aq-sm">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setSearchOpen(true)}
                >
                  Search catalogue
                </Button>

                {!showManualForm ? (
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => setShowManualForm(true)}
                  >
                    Add manual part
                  </Button>
                ) : (
                  <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg flex flex-col gap-aq-sm">
                    <input
                      type="text"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="Part name"
                      className={inputClass}
                    />
                    <input
                      type="number"
                      value={manualPrice}
                      onChange={(e) => setManualPrice(e.target.value)}
                      placeholder="Price (sell)"
                      className={inputClass}
                    />
                    <div className="flex gap-aq-sm">
                      <Button
                        variant="primary"
                        className="flex-1"
                        onClick={addManualPart}
                        disabled={!manualName.trim()}
                      >
                        Add
                      </Button>
                      <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={() => setShowManualForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Labour */}
            <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
              <p className="text-body font-medium text-aq-ink mb-aq-md">Labour</p>
              <Stepper
                value={labourHours}
                onChange={setLabourHours}
                min={0}
                max={20}
                step={0.5}
                label="Hours"
              />
            </div>

            {/* Save to catalogue toggle */}
            <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
              <div className="flex items-center justify-between mb-aq-md">
                <p className="text-body font-medium text-aq-ink">Save to catalogue</p>
                <button
                  type="button"
                  onClick={() => setSaveToCalogue((prev) => !prev)}
                  className={`w-12 h-7 rounded-full border-2 transition-colors duration-200 relative ${
                    saveToCalogue
                      ? 'bg-aq-green border-aq-green'
                      : 'bg-white border-aq-border'
                  }`}
                  aria-pressed={saveToCalogue}
                  aria-label="Save to catalogue"
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                      saveToCalogue ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {saveToCalogue && (
                <>
                  {/* Fits tag pills */}
                  <div className="mb-aq-md">
                    <p className="text-secondary text-aq-muted mb-aq-sm">Fits</p>
                    <div className="flex flex-wrap gap-aq-sm">
                      {FITS_VALUES.map((value) => (
                        <TagPill
                          key={value}
                          label={JOINERY_TYPE_LABELS[value]}
                          selected={selectedFits.includes(value)}
                          onToggle={() => toggleFit(value)}
                          colour="green"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Fixes tag pills */}
                  <div>
                    <p className="text-secondary text-aq-muted mb-aq-sm">Fixes</p>
                    <div className="flex flex-wrap gap-aq-sm">
                      {FIXES_VALUES.map((value) => (
                        <TagPill
                          key={value}
                          label={FIXES_LABELS[value]}
                          selected={selectedFixes.includes(value)}
                          onToggle={() => toggleFix(value)}
                          colour="gold"
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>

          {/* Add to job */}
          <div className="mt-aq-2xl">
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
