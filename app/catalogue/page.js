'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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
import { getParts, createPart, updatePart } from '@/lib/db'
import { useJob } from '@/lib/job-context'
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

function PartCard({ part, onAddToJob, onEdit }) {
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

      {/* Pricing row — Cost / RRP / Sell */}
      <div className="flex items-baseline gap-aq-lg mb-aq-sm flex-wrap">
        {part.cost_price != null ? (
          <span className="text-caption text-aq-muted">
            Cost {formatCurrency(part.cost_price)}
          </span>
        ) : (
          <span className="text-caption text-aq-subtle italic">
            Add your cost price
          </span>
        )}
        {part.rrp != null && (
          <span className="text-caption text-aq-muted">
            RRP {formatCurrency(part.rrp)}
          </span>
        )}
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

      {/* Action buttons */}
      {(onAddToJob || onEdit) && (
        <div className="mt-aq-md pt-aq-md border-t border-aq-border flex gap-aq-sm">
          {onAddToJob && (
            <Button variant="primary" fullWidth onClick={onAddToJob}>
              Add to job
            </Button>
          )}
          {onEdit && (
            <Button variant="secondary" fullWidth onClick={onEdit}>
              Edit
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function fieldInputClass(hasError) {
  return `w-full bg-white border ${hasError ? 'border-[#D94444]' : 'border-aq-border'} rounded-aq-md min-h-tap px-4 text-body text-aq-ink placeholder:text-aq-subtle focus:outline-none focus:border-aq-green transition-colors duration-150`
}

function FieldError({ msg }) {
  if (!msg) return null
  return <p style={{ fontSize: 14, color: '#D94444', marginTop: 4 }}>{msg}</p>
}

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
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  const cost = parseFloat(costPrice) || 0
  const markup = parseFloat(markupPct) || 0
  const sellPrice = calcSellPrice(cost, markup)

  function clearError(field) {
    if (fieldErrors[field]) setFieldErrors((prev) => { const next = { ...prev }; delete next[field]; return next })
  }

  function toggleFit(v) {
    setFits((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))
  }
  function toggleFix(v) {
    setFixes((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))
  }

  async function handleSave() {
    const errors = {}
    if (!name.trim()) errors.name = 'Part name is required'
    if (!category) errors.category = 'Pick a category'
    if (sellPrice <= 0) errors.sellPrice = 'Enter a sell price'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setSaving(true)
    setSaveError(null)
    const result = await onSave({
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
    if (result?.error) {
      setSaveError(result.error.message || 'Could not save part. Check your connection and try again.')
      setSaving(false)
    }
    // On success the parent closes this form
  }

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="max-w-[480px] mx-auto px-aq-lg pb-[88px]">

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

          <div>
            <label className="block text-secondary text-aq-muted mb-aq-sm" htmlFor="new-name">
              Part name *
            </label>
            <input
              id="new-name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); clearError('name') }}
              placeholder="e.g. Sliding door roller pair"
              className={fieldInputClass(!!fieldErrors.name)}
            />
            <FieldError msg={fieldErrors.name} />
            {!fieldErrors.name && sku.trim() && name.toLowerCase().includes(sku.trim().toLowerCase()) && (
              <p className="text-caption text-aq-muted mt-aq-sm">
                Tip: leave supplier codes out of the part name. The customer sees this name on the quote.
              </p>
            )}
          </div>

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

          <div>
            <label className="block text-secondary text-aq-muted mb-aq-sm" htmlFor="new-cost">
              Cost price (ex GST)
            </label>
            <input
              id="new-cost"
              type="number"
              inputMode="decimal"
              value={costPrice}
              onChange={(e) => { setCostPrice(e.target.value); clearError('sellPrice') }}
              placeholder="0.00"
              className={fieldInputClass(!!fieldErrors.sellPrice)}
            />
          </div>
          <div>
            <label className="block text-secondary text-aq-muted mb-aq-sm" htmlFor="new-markup">
              Markup %
            </label>
            <input
              id="new-markup"
              type="number"
              inputMode="decimal"
              value={markupPct}
              onChange={(e) => { setMarkupPct(e.target.value); clearError('sellPrice') }}
              className={fieldInputClass(!!fieldErrors.sellPrice)}
            />
            {sellPrice > 0 ? (
              <p className="text-secondary font-medium text-aq-green mt-aq-sm">
                Sell price: {formatCurrency(sellPrice)}
              </p>
            ) : (
              <FieldError msg={fieldErrors.sellPrice} />
            )}
          </div>

          <div>
            <p className={`text-secondary mb-aq-sm ${fieldErrors.category ? 'text-[#D94444]' : 'text-aq-muted'}`}>
              Category *
            </p>
            <div className="flex flex-wrap gap-aq-sm">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setCategory(c); clearError('category') }}
                  className={`min-h-tap px-aq-lg text-secondary font-medium rounded-aq-lg border transition-colors duration-150 ${
                    category === c
                      ? 'border-aq-green bg-aq-green-tint text-aq-green'
                      : fieldErrors.category
                      ? 'border-[#D94444] text-aq-muted bg-white'
                      : 'border-aq-border text-aq-muted bg-white hover:bg-aq-surface'
                  }`}
                >
                  {PART_CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
            <FieldError msg={fieldErrors.category} />
          </div>

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
          {saveError && (
            <p style={{ fontSize: 14, color: '#D94444', marginBottom: 12 }}>{saveError}</p>
          )}
          <Button variant="primary" fullWidth disabled={saving} onClick={handleSave}>
            {saving ? 'Saving...' : 'Save part'}
          </Button>
        </div>

      </div>
    </div>
  )
}

function EditPartForm({ part, onSave, onClose }) {
  const [name, setName] = useState(part.name || '')
  const [sku, setSku] = useState(part.sku || '')
  const [supplier, setSupplier] = useState(part.supplier || '')
  const [costPrice, setCostPrice] = useState(String(part.cost_price ?? ''))
  const [rrp, setRrp] = useState(part.rrp != null ? String(part.rrp) : '')
  const [sellPrice, setSellPrice] = useState(String(part.sell_price ?? ''))
  const [category, setCategory] = useState(part.category || '')
  const [unit, setUnit] = useState(part.unit || 'each')
  const [fits, setFits] = useState(part.fits || [])
  const [fixes, setFixes] = useState(part.fixes || [])

  function handleRrpChange(val) {
    setRrp(val)
    const r = parseFloat(val)
    if (!isNaN(r) && r > 0) {
      setSellPrice((r * 1.2).toFixed(2))
    }
  }

  function toggleFit(v) {
    setFits((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))
  }
  function toggleFix(v) {
    setFixes((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))
  }

  function handleSave() {
    const cost = parseFloat(costPrice) || 0
    const sell = parseFloat(sellPrice) || 0
    const rrpVal = parseFloat(rrp) || null
    if (!name.trim() || !category || cost <= 0 || sell <= 0) return
    onSave({
      ...part,
      name: name.trim(),
      sku: sku.trim(),
      supplier: supplier.trim(),
      cost_price: cost,
      rrp: rrpVal,
      sell_price: sell,
      category,
      unit,
      fits,
      fixes,
    })
  }

  const cost = parseFloat(costPrice) || 0
  const sell = parseFloat(sellPrice) || 0
  const canSave = name.trim() && category && cost > 0 && sell > 0

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="max-w-[480px] mx-auto px-aq-lg pb-[88px]">

        <div className="flex items-center gap-aq-sm py-aq-xl sticky top-0 bg-white border-b border-aq-border -mx-aq-lg px-aq-lg mb-aq-lg">
          <button
            type="button"
            onClick={onClose}
            className="min-h-tap min-w-[48px] flex items-center justify-center text-aq-ink hover:text-aq-green transition-colors -ml-3"
            aria-label="Close"
          >
            <XIcon />
          </button>
          <h2 className="text-page-title font-medium text-aq-ink">Edit part</h2>
        </div>

        <div className="flex flex-col gap-aq-lg">

          <div>
            <label className="block text-secondary text-aq-muted mb-aq-sm" htmlFor="edit-name">
              Part name *
            </label>
            <input id="edit-name" type="text" value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass} />
          </div>

          <div>
            <label className="block text-secondary text-aq-muted mb-aq-sm" htmlFor="edit-sku">
              SKU
            </label>
            <input id="edit-sku" type="text" value={sku}
              onChange={(e) => setSku(e.target.value)}
              className={inputClass} />
          </div>

          <div>
            <label className="block text-secondary text-aq-muted mb-aq-sm" htmlFor="edit-supplier">
              Supplier
            </label>
            <input id="edit-supplier" type="text" value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className={inputClass} />
          </div>

          <div>
            <p className="text-secondary text-aq-muted mb-aq-sm">Unit</p>
            <div className="flex flex-wrap gap-aq-sm">
              {UNITS.map((u) => (
                <button key={u} type="button" onClick={() => setUnit(u)}
                  className={`min-h-tap px-aq-lg text-secondary font-medium rounded-aq-lg border transition-colors duration-150 ${
                    unit === u
                      ? 'border-aq-green bg-aq-green-tint text-aq-green'
                      : 'border-aq-border text-aq-muted bg-white hover:bg-aq-surface'
                  }`}>
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-secondary text-aq-muted mb-aq-sm" htmlFor="edit-cost">
              Cost price (ex GST) *
            </label>
            <input id="edit-cost" type="number" value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="0.00"
              className={inputClass} />
          </div>

          <div>
            <label className="block text-secondary text-aq-muted mb-aq-sm" htmlFor="edit-rrp">
              RRP (optional)
            </label>
            <input id="edit-rrp" type="number" value={rrp}
              onChange={(e) => handleRrpChange(e.target.value)}
              placeholder="0.00"
              className={inputClass} />
            {rrp && parseFloat(rrp) > 0 && (
              <p className="text-caption text-aq-muted mt-aq-sm">
                Sell suggested at {formatCurrency(parseFloat(rrp) * 1.2)} (RRP x 1.2)
              </p>
            )}
          </div>

          <div>
            <label className="block text-secondary text-aq-muted mb-aq-sm" htmlFor="edit-sell">
              Sell price *
            </label>
            <input id="edit-sell" type="number" value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              placeholder="0.00"
              className={inputClass} />
          </div>

          <div>
            <p className="text-secondary text-aq-muted mb-aq-sm">Category *</p>
            <div className="flex flex-wrap gap-aq-sm">
              {CATEGORIES.map((c) => (
                <button key={c} type="button" onClick={() => setCategory(c)}
                  className={`min-h-tap px-aq-lg text-secondary font-medium rounded-aq-lg border transition-colors duration-150 ${
                    category === c
                      ? 'border-aq-green bg-aq-green-tint text-aq-green'
                      : 'border-aq-border text-aq-muted bg-white hover:bg-aq-surface'
                  }`}>
                  {PART_CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-secondary text-aq-muted mb-aq-sm">Fits</p>
            <div className="flex flex-wrap gap-aq-sm">
              {FITS_VALUES.map((v) => (
                <SelectPill key={v} label={JOINERY_TYPE_LABELS[v]} selected={fits.includes(v)}
                  onToggle={() => toggleFit(v)} colour="green" />
              ))}
            </div>
          </div>

          <div>
            <p className="text-secondary text-aq-muted mb-aq-sm">Fixes</p>
            <div className="flex flex-wrap gap-aq-sm">
              {FIXES_VALUES.map((v) => (
                <SelectPill key={v} label={FIXES_LABELS[v]} selected={fixes.includes(v)}
                  onToggle={() => toggleFix(v)} colour="gold" />
              ))}
            </div>
          </div>

        </div>

        <div className="mt-aq-2xl">
          <Button variant="primary" fullWidth disabled={!canSave} onClick={handleSave}>
            Save changes
          </Button>
        </div>

      </div>
    </div>
  )
}

function CatalogueContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { addItem } = useJob()

  const jobId = searchParams.get('jobId')
  const fromJob = searchParams.get('from') === 'job' && !!jobId

  const [parts, setParts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [addFormOpen, setAddFormOpen] = useState(false)
  const [editingPart, setEditingPart] = useState(null)

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

  async function handleSavePart(newPart) {
    const { data, error } = await createPart(newPart)
    if (error) return { error }
    // Use the DB-returned row so business_id and any server defaults are correct
    setParts((prev) => [...prev, data || newPart])
    setAddFormOpen(false)
    return { error: null }
  }

  function handleEditSave(updatedPart) {
    setParts((prev) => prev.map((p) => (p.id === updatedPart.id ? updatedPart : p)))
    setEditingPart(null)
    updatePart(updatedPart.id, updatedPart)
  }

  function handleAddToJob(part) {
    addItem({
      type: 'custom',
      description: part.name,
      parts: [{
        part_id: part.id,
        name: part.name,
        sku: part.sku,
        sell_price: part.sell_price,
        cost_price: part.cost_price,
        qty: part.default_qty || 1,
        unit: part.unit,
        supplier: part.supplier,
        supplier_code: part.supplier_code,
      }],
      labour_hours: 0,
      hourly_rate: 85,
    })
    router.push(`/jobs/${jobId}/items`)
  }

  return (
    <>
      {addFormOpen && (
        <AddPartForm
          onSave={handleSavePart}
          onClose={() => setAddFormOpen(false)}
        />
      )}
      {editingPart && (
        <EditPartForm
          part={editingPart}
          onSave={handleEditSave}
          onClose={() => setEditingPart(null)}
        />
      )}

      <div className="min-h-dvh bg-aq-surface">
        <div className="max-w-[480px] mx-auto px-aq-lg pb-40">

          {/* Header */}
          <div className="flex items-center gap-aq-sm py-aq-xl">
            {fromJob ? (
              <BackButton href={`/jobs/${jobId}/items/add`} label="Add item" />
            ) : (
              <BackButton href="/" label="Home" />
            )}
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
                <PartCard
                  key={part.id}
                  part={part}
                  onAddToJob={fromJob ? () => handleAddToJob(part) : null}
                  onEdit={!fromJob ? () => setEditingPart(part) : null}
                />
              ))}
            </div>
          )}

        </div>
      </div>

      {/* Fixed bottom "Add new part" button */}
      <div className="fixed bottom-[56px] left-0 right-0 bg-white border-t border-aq-border px-aq-lg py-aq-md">
        <div className="max-w-[480px] mx-auto">
          <Button variant="primary" fullWidth onClick={() => setAddFormOpen(true)}>
            Add new part
          </Button>
        </div>
      </div>
    </>
  )
}

export default function CataloguePage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh bg-aq-surface flex items-center justify-center">
        <p className="text-body text-aq-muted">Loading...</p>
      </div>
    }>
      <CatalogueContent />
    </Suspense>
  )
}
