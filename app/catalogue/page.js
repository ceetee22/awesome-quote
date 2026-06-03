'use client'

import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  PART_CATEGORY,
  PART_CATEGORY_LABELS,
  JOINERY_TYPE_LABELS,
  FITS_VALUES,
  FIXES_VALUES,
  FIXES_LABELS,
  DEFAULT_SETTINGS,
} from '@/lib/constants'
import { calcSellPrice, formatCurrency } from '@/lib/pricing'
import { getParts, createPart } from '@/lib/db'
import Button from '@/components/Button'
import BackButton from '@/components/BackButton'

function XIcon() {
  return (
    <svg
      width="20"
      height="20"
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

const CATEGORIES = Object.values(PART_CATEGORY)
const UNITS = ['each', 'pair', 'set', 'metre']

const inputClass =
  'w-full bg-white border border-aq-border rounded-aq-md min-h-tap px-4 text-body text-aq-ink placeholder:text-aq-subtle focus:outline-none focus:border-aq-green transition-colors duration-150'

// Small read-only tag pill
function FitPill({ label }) {
  return (
    <span className="inline-flex items-center px-aq-sm py-aq-xs text-caption font-medium text-aq-green bg-aq-green-tint border border-aq-green-tint-border rounded-aq-sm">
      {label}
    </span>
  )
}

function FixPill({ label }) {
  return (
    <span className="inline-flex items-center px-aq-sm py-aq-xs text-caption font-medium text-aq-ink bg-aq-gold-tint border border-aq-gold-tint-border rounded-aq-sm">
      {label}
    </span>
  )
}

// Toggle pill for multi-select in the add form
function SelectPill({ label, selected, onToggle, colour = 'green' }) {
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

// Part card shown in the list
function PartCard({ part }) {
  return (
    <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
      {/* Name + category badge */}
      <div className="flex items-start justify-between gap-aq-sm mb-aq-xs">
        <p className="text-body font-medium text-aq-ink leading-snug flex-1">
          {part.name}
        </p>
        <span className="inline-flex items-center px-[14px] py-[6px] text-caption font-medium text-aq-muted bg-aq-status-draft rounded-aq-md whitespace-nowrap shrink-0">
          {PART_CATEGORY_LABELS[part.category] || part.category}
        </span>
      </div>

      {/* SKU + supplier */}
      <p className="text-caption font-medium text-aq-muted mb-aq-sm">
        {part.sku}
        {part.supplier ? (
          <span className="font-regular text-aq-subtle"> &middot; {part.supplier}</span>
        ) : null}
      </p>

      {/* Pricing row */}
      <div className="flex items-baseline gap-aq-lg mb-aq-sm">
        <span className="text-caption text-aq-muted">
          Cost {formatCurrency(part.cost_price)}
        </span>
        <span className="text-secondary font-medium text-aq-green">
          Sell {formatCurrency(part.sell_price)}
        </span>
        <span className="text-caption text-aq-subtle">per {part.unit}</span>
      </div>

      {/* Fits + fixes tags */}
      {(part.fits?.length > 0 || part.fixes?.length > 0) && (
        <div className="flex flex-wrap gap-aq-xs">
          {(part.fits || []).map((v) => (
            <FitPill key={v} label={JOINERY_TYPE_LABELS[v] || v} />
          ))}
          {(part.fixes || []).map((v) => (
            <FixPill key={v} label={FIXES_LABELS[v] || v} />
          ))}
        </div>
      )}
    </div>
  )
}

// Full-screen add new part form
function AddPartForm({ onSave, onClose }) {
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [supplier, setSupplier] = useState('Joinery Hardware NZ')
  const [costPrice, setCostPrice] = useState('')
  const [markupPct, setMarkupPct] = useState(String(DEFAULT_SETTINGS.default_markup_pct))
  const [category, setCategory] = useState('')
  const [unit, setUnit] = useState('each')
  const [fits, setFits] = useState([])
  const [fixes, setFixes] = useState([])

  const cost = parseFloat(costPrice) || 0
  const markup = parseFloat(markupPct) || 0
  const sellPrice = calcSellPrice(cost, markup)

  function toggleFit(v) {
    setFits((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))
  }
  function toggleFix(v) {
    setFixes((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))
  }

  function handleSave() {
    if (!name.trim() || !category || cost <= 0) return
    onSave({
      id: uuidv4(),
      sku: sku.trim(),
      name: name.trim(),
      supplier: supplier.trim(),
      supplier_code: '',
      cost_price: cost,
      sell_price: sellPrice,
      category,
      fits,
      fixes,
      default_qty: 1,
      photo_url: null,
      unit,
      active: true,
    })
  }

  const canSave = name.trim() && category && cost > 0

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="max-w-[480px] mx-auto px-aq-lg pb-aq-2xl">

        {/* Modal header */}
        <div className="flex items-center gap-aq-sm py-aq-xl sticky top-0 bg-white border-b border-aq-border -mx-aq-lg px-aq-lg mb-aq-lg">
          <button
            type="button"
            onClick={onClose}
            className="min-h-tap min-w-[48px] flex items-center justify-center text-aq-ink hover:text-aq-green transition-colors -ml-3"
            aria-label="Close"
          >
            <XIcon />
          </button>
          <h2 className="text-page-title font-medium text-aq-ink">Add new part</h2>
        </div>

        <div className="flex flex-col gap-aq-lg">

          {/* Name */}
          <div>
            <label className="block text-secondary text-aq-muted mb-aq-sm" htmlFor="new-name">
              Part name *
            </label>
            <input
              id="new-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sliding door roller pair"
              className={inputClass}
            />
          </div>

          {/* SKU */}
          <div>
            <label className="block text-secondary text-aq-muted mb-aq-sm" htmlFor="new-sku">
              SKU
            </label>
            <input
              id="new-sku"
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. DR-220"
              className={inputClass}
            />
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-secondary text-aq-muted mb-aq-sm" htmlFor="new-supplier">
              Supplier
            </label>
            <input
              id="new-supplier"
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Unit */}
          <div>
            <p className="text-secondary text-aq-muted mb-aq-sm">Unit</p>
            <div className="flex flex-wrap gap-aq-sm">
              {UNITS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={`min-h-tap px-aq-lg text-secondary font-medium rounded-aq-lg border transition-colors duration-150 ${
                    unit === u
                      ? 'border-aq-green bg-aq-green-tint text-aq-green'
                      : 'border-aq-border text-aq-muted bg-white hover:bg-aq-surface'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div>
            <label className="block text-secondary text-aq-muted mb-aq-sm" htmlFor="new-cost">
              Cost price (ex GST) *
            </label>
            <input
              id="new-cost"
              type="number"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-secondary text-aq-muted mb-aq-sm" htmlFor="new-markup">
              Markup %
            </label>
            <input
              id="new-markup"
              type="number"
              value={markupPct}
              onChange={(e) => setMarkupPct(e.target.value)}
              className={inputClass}
            />
            {cost > 0 && (
              <p className="text-secondary font-medium text-aq-green mt-aq-sm">
                Sell price: {formatCurrency(sellPrice)}
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <p className="text-secondary text-aq-muted mb-aq-sm">Category *</p>
            <div className="flex flex-wrap gap-aq-sm">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`min-h-tap px-aq-lg text-secondary font-medium rounded-aq-lg border transition-colors duration-150 ${
                    category === c
                      ? 'border-aq-green bg-aq-green-tint text-aq-green'
                      : 'border-aq-border text-aq-muted bg-white hover:bg-aq-surface'
                  }`}
                >
                  {PART_CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          {/* Fits */}
          <div>
            <p className="text-secondary text-aq-muted mb-aq-sm">Fits</p>
            <div className="flex flex-wrap gap-aq-sm">
              {FITS_VALUES.map((v) => (
                <SelectPill
                  key={v}
                  label={JOINERY_TYPE_LABELS[v]}
                  selected={fits.includes(v)}
                  onToggle={() => toggleFit(v)}
                  colour="green"
                />
              ))}
            </div>
          </div>

          {/* Fixes */}
          <div>
            <p className="text-secondary text-aq-muted mb-aq-sm">Fixes</p>
            <div className="flex flex-wrap gap-aq-sm">
              {FIXES_VALUES.map((v) => (
                <SelectPill
                  key={v}
                  label={FIXES_LABELS[v]}
                  selected={fixes.includes(v)}
                  onToggle={() => toggleFix(v)}
                  colour="gold"
                />
              ))}
            </div>
          </div>

        </div>

        <div className="mt-aq-2xl">
          <Button variant="primary" fullWidth disabled={!canSave} onClick={handleSave}>
            Save part
          </Button>
        </div>

      </div>
    </div>
  )
}

export default function CataloguePage() {
  const [parts, setParts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [addFormOpen, setAddFormOpen] = useState(false)

  useEffect(() => {
    getParts().then((data) => {
      setParts(data)
      setLoading(false)
    })
  }, [])

  const filtered = parts.filter((p) => {
    if (!p.active) return false
    const q = searchQuery.trim().toLowerCase()
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q)
    const matchesCategory = !selectedCategory || p.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  function handleSavePart(newPart) {
    setParts((prev) => [...prev, newPart])
    setAddFormOpen(false)
    createPart(newPart)
  }

  return (
    <>
      {addFormOpen && (
        <AddPartForm
          onSave={handleSavePart}
          onClose={() => setAddFormOpen(false)}
        />
      )}

      <div className="min-h-dvh bg-aq-surface">
        <div className="max-w-[480px] mx-auto px-aq-lg pb-32">

          {/* Header */}
          <div className="flex items-center gap-aq-sm py-aq-xl">
            <BackButton href="/" label="Home" />
            <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm">Parts catalogue</h1>
          </div>

          {/* Search */}
          <div className="mb-aq-md">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search parts"
              className={inputClass}
            />
          </div>

          {/* Category filter pills */}
          <div className="flex flex-wrap gap-aq-sm mb-aq-lg">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`min-h-tap px-aq-lg text-secondary font-medium rounded-aq-lg border transition-colors duration-150 ${
                selectedCategory === null
                  ? 'border-aq-green bg-aq-green-tint text-aq-green'
                  : 'border-aq-border text-aq-muted bg-white hover:bg-aq-surface'
              }`}
            >
              All
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() =>
                  setSelectedCategory(selectedCategory === cat ? null : cat)
                }
                className={`min-h-tap px-aq-lg text-secondary font-medium rounded-aq-lg border transition-colors duration-150 ${
                  selectedCategory === cat
                    ? 'border-aq-green bg-aq-green-tint text-aq-green'
                    : 'border-aq-border text-aq-muted bg-white hover:bg-aq-surface'
                }`}
              >
                {PART_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Parts list */}
          {loading ? (
            <p className="text-body text-aq-muted text-center py-aq-2xl">Loading...</p>
          ) : filtered.length === 0 ? (
            <div className="bg-white border border-aq-border rounded-aq-xl p-aq-xl text-center">
              <p className="text-body text-aq-muted">No parts match your search.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-[10px]">
              {filtered.map((part) => (
                <PartCard key={part.id} part={part} />
              ))}
            </div>
          )}

        </div>
      </div>

      {/* Fixed bottom "Add new part" button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-aq-border px-aq-lg py-aq-md">
        <div className="max-w-[480px] mx-auto">
          <Button variant="primary" fullWidth onClick={() => setAddFormOpen(true)}>
            Add new part
          </Button>
        </div>
      </div>
    </>
  )
}
