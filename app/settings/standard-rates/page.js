'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSettings } from '@/lib/settings-context'
import { getParts } from '@/lib/db'
import { REPAIR_TEMPLATE_FAULTS, TOTAL_TEMPLATE_COUNT } from '@/lib/constants'
import { formatCurrency } from '@/lib/pricing'
import BackButton from '@/components/BackButton'
import Button from '@/components/Button'
import ConfirmModal from '@/components/ConfirmModal'

// ─── Joinery type icons (solid-fill) ─────────────────────────────────────────

function SlidingDoorIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <rect x="1" y="1.5" width="8" height="15" rx="1" />
      <rect x="11" y="1.5" width="8" height="15" rx="1" />
      <rect x="1" y="17.5" width="18" height="1.5" rx="0.5" />
      <rect x="7.5" y="8" width="1.5" height="3.5" rx="0.5" fill="white" />
      <rect x="11" y="8" width="1.5" height="3.5" rx="0.5" fill="white" />
    </svg>
  )
}

function BifoldDoorIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <rect x="1" y="1.5" width="8" height="15" rx="1" />
      <rect x="11" y="1.5" width="8" height="15" rx="1" />
      <rect x="9" y="1.5" width="2" height="15" rx="0.5" />
      <rect x="1" y="17.5" width="18" height="1.5" rx="0.5" />
      <circle cx="8.5" cy="9.5" r="1" fill="white" />
      <circle cx="11.5" cy="9.5" r="1" fill="white" />
    </svg>
  )
}

function HingedDoorIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <rect x="3" y="1.5" width="14" height="17" rx="1" />
      <rect x="3" y="1.5" width="2.5" height="17" rx="1" />
      <circle cx="15" cy="10" r="1.5" fill="white" />
    </svg>
  )
}

function WindowAliIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <rect x="1" y="1" width="18" height="18" rx="1.5" />
      <rect x="8.5" y="1" width="3" height="18" fill="white" />
      <rect x="1" y="8.5" width="18" height="3" fill="white" />
    </svg>
  )
}

function WindowTimberIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <rect x="1" y="1" width="18" height="18" rx="2" />
      <rect x="3.5" y="3.5" width="13" height="5.5" rx="0.5" fill="white" />
      <rect x="3.5" y="11" width="13" height="5.5" rx="0.5" fill="white" />
    </svg>
  )
}

function JoineryIcon({ type, size = 18 }) {
  switch (type) {
    case 'sliding_door': return <SlidingDoorIcon size={size} />
    case 'bifold_door':  return <BifoldDoorIcon size={size} />
    case 'hinged_door':  return <HingedDoorIcon size={size} />
    case 'window_ali':   return <WindowAliIcon size={size} />
    case 'window_timber': return <WindowTimberIcon size={size} />
    default: return null
  }
}

// ─── Edit panel ───────────────────────────────────────────────────────────────

function formatLabour(minutes) {
  if (!minutes) return 'No labour'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} hr`
  return `${h} hr ${m} min`
}

function EditPanel({ type, fault, template, catalogueParts, settings, onSave, onDelete, onClose }) {
  const [selectedParts, setSelectedParts] = useState([])
  const [labourMinutes, setLabourMinutes] = useState(0)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setSelectedParts(template?.parts ? [...template.parts] : [])
    setLabourMinutes(template?.labour_minutes ?? 0)
    setSearch('')
    setSaved(false)
  }, [type, fault, template?.id])

  const filteredParts = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return catalogueParts
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 6)
  }, [search, catalogueParts])

  const standardRate = useMemo(() => {
    const partsTotal = selectedParts.reduce((sum, p) => sum + (p.sell_price || 0) * (p.qty || 1), 0)
    const labourTotal = (labourMinutes / 60) * (settings.hourly_labour_rate || 85)
    return partsTotal + labourTotal
  }, [selectedParts, labourMinutes, settings.hourly_labour_rate])

  function addPart(part) {
    setSelectedParts((prev) => {
      const existing = prev.find((p) => p.part_id === part.id)
      if (existing) {
        return prev.map((p) => p.part_id === part.id ? { ...p, qty: p.qty + 1 } : p)
      }
      return [...prev, { part_id: part.id, name: part.name, sell_price: part.sell_price || 0, qty: 1 }]
    })
    setSearch('')
  }

  function removePart(partId) {
    setSelectedParts((prev) => prev.filter((p) => p.part_id !== partId))
  }

  function updateQty(partId, delta) {
    setSelectedParts((prev) =>
      prev.map((p) => p.part_id === partId ? { ...p, qty: Math.max(1, p.qty + delta) } : p)
    )
  }

  function adjustLabour(delta) {
    setLabourMinutes((prev) => Math.max(0, Math.min(480, prev + delta)))
  }

  async function handleSave() {
    setSaving(true)
    await onSave({ joinery_type: type, fault, labour_minutes: labourMinutes, parts: selectedParts })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleDelete() {
    if (!template) return
    setDeleting(true)
    await onDelete(template.id)
    setDeleting(false)
    setDeleteOpen(false)
  }

  const groupLabel = REPAIR_TEMPLATE_FAULTS.find((g) => g.type === type)?.label || type

  return (
    <div className="min-h-dvh lg:min-h-0 bg-white">
      {/* Header */}
      <div className="px-aq-lg py-aq-xl border-b border-aq-border">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-aq-xs text-secondary text-aq-muted mb-aq-sm lg:hidden"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 12L6 8l4-4" />
          </svg>
          {groupLabel}
        </button>
        <h2 className="text-section font-medium text-aq-ink">{fault}</h2>
        <p className="text-caption text-aq-muted mt-aq-xs">{groupLabel}</p>
      </div>

      <div className="px-aq-lg pb-aq-2xl max-w-[600px]">

        {/* Parts */}
        <div className="mt-aq-lg">
          <p className="text-secondary font-medium text-aq-ink mb-aq-md">Parts</p>

          {/* Selected parts */}
          {selectedParts.length > 0 && (
            <div className="flex flex-col gap-[8px] mb-aq-md">
              {selectedParts.map((p) => (
                <div
                  key={p.part_id}
                  className="flex items-center gap-aq-sm bg-aq-surface border border-aq-border rounded-aq-lg px-aq-md py-aq-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-secondary text-aq-ink truncate">{p.name}</p>
                    <p className="text-caption text-aq-muted">{formatCurrency(p.sell_price)} each</p>
                  </div>
                  <div className="flex items-center gap-aq-xs shrink-0">
                    <button
                      onClick={() => updateQty(p.part_id, -1)}
                      className="w-8 h-8 flex items-center justify-center rounded-aq-md border border-aq-border bg-white text-aq-ink hover:bg-aq-surface transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <svg width="12" height="2" viewBox="0 0 12 2" fill="currentColor"><rect width="12" height="2" rx="1" /></svg>
                    </button>
                    <span className="w-6 text-center text-secondary text-aq-ink font-medium">{p.qty}</span>
                    <button
                      onClick={() => updateQty(p.part_id, 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-aq-md border border-aq-border bg-white text-aq-ink hover:bg-aq-surface transition-colors"
                      aria-label="Increase quantity"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <rect x="5" y="0" width="2" height="12" rx="1" />
                        <rect x="0" y="5" width="12" height="2" rx="1" />
                      </svg>
                    </button>
                    <button
                      onClick={() => removePart(p.part_id)}
                      className="w-8 h-8 flex items-center justify-center rounded-aq-md text-aq-muted hover:text-red-600 transition-colors ml-aq-xs"
                      aria-label="Remove part"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M2 2l10 10M12 2L2 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Part search */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={catalogueParts.length === 0 ? 'Loading catalogue...' : 'Search parts to add...'}
              disabled={catalogueParts.length === 0}
              className="w-full bg-white border border-aq-border rounded-aq-md min-h-tap px-4 text-body text-aq-ink placeholder:text-aq-subtle focus:outline-none focus:border-aq-green transition-colors duration-150"
            />
            {filteredParts.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-aq-border rounded-aq-lg shadow-md z-10 overflow-hidden">
                {filteredParts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addPart(p)}
                    className="w-full text-left px-4 py-3 flex items-center justify-between gap-aq-sm hover:bg-aq-surface border-b border-aq-border last:border-0 transition-colors"
                  >
                    <span className="text-secondary text-aq-ink truncate flex-1">{p.name}</span>
                    <span className="text-caption text-aq-muted shrink-0">{formatCurrency(p.sell_price || 0)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Labour */}
        <div className="mt-aq-xl">
          <p className="text-secondary font-medium text-aq-ink mb-aq-md">Labour</p>
          <div className="flex items-center gap-aq-md">
            <button
              onClick={() => adjustLabour(-30)}
              disabled={labourMinutes === 0}
              className="w-12 h-12 flex items-center justify-center rounded-aq-lg border border-aq-border bg-white text-aq-ink disabled:opacity-40 hover:bg-aq-surface transition-colors"
              aria-label="Decrease by 30 minutes"
            >
              <svg width="14" height="2" viewBox="0 0 14 2" fill="currentColor"><rect width="14" height="2" rx="1" /></svg>
            </button>
            <div className="flex-1 text-center">
              <p className="text-section font-medium text-aq-ink">{formatLabour(labourMinutes)}</p>
            </div>
            <button
              onClick={() => adjustLabour(30)}
              disabled={labourMinutes >= 480}
              className="w-12 h-12 flex items-center justify-center rounded-aq-lg border border-aq-border bg-white text-aq-ink disabled:opacity-40 hover:bg-aq-surface transition-colors"
              aria-label="Increase by 30 minutes"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <rect x="6" y="0" width="2" height="14" rx="1" />
                <rect x="0" y="6" width="14" height="2" rx="1" />
              </svg>
            </button>
          </div>
          <p className="text-caption text-aq-muted mt-aq-xs text-center">Adjusts in 30-minute steps</p>
        </div>

        {/* Standard rate */}
        <div className="mt-aq-xl bg-aq-surface border border-aq-border rounded-aq-xl p-aq-lg">
          <div className="flex items-center justify-between">
            <p className="text-secondary text-aq-muted">Standard rate</p>
            <p className="text-section font-medium text-aq-green">{formatCurrency(standardRate)}</p>
          </div>
          {selectedParts.length > 0 && (
            <p className="text-caption text-aq-muted mt-aq-xs">
              Parts {formatCurrency(selectedParts.reduce((s, p) => s + (p.sell_price || 0) * p.qty, 0))}
              {labourMinutes > 0 && ` + Labour ${formatCurrency((labourMinutes / 60) * (settings.hourly_labour_rate || 85))}`}
            </p>
          )}
          {selectedParts.length === 0 && labourMinutes > 0 && (
            <p className="text-caption text-aq-muted mt-aq-xs">
              Labour only at ${settings.hourly_labour_rate || 85}/hr
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-aq-lg flex flex-col gap-aq-sm">
          <Button
            variant="primary"
            fullWidth
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save standard rate'}
          </Button>
          {template && (
            <Button
              variant="destructive"
              fullWidth
              onClick={() => setDeleteOpen(true)}
            >
              Delete standard rate
            </Button>
          )}
        </div>
      </div>

      <ConfirmModal
        open={deleteOpen}
        question="Delete this standard rate?"
        confirmLabel="Yes, delete"
        cancelLabel="Keep"
        variant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  )
}

// ─── Tick / empty circle indicators ──────────────────────────────────────────

function TickIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="#16A34A" />
      <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EmptyCircleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" stroke="#D1D5DB" strokeWidth="1.5" />
    </svg>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StandardRatesPage() {
  const { settings } = useSettings()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [catalogueParts, setCatalogueParts] = useState([])
  const [partsLoaded, setPartsLoaded] = useState(false)
  const [selected, setSelected] = useState(null) // { type, fault }

  useEffect(() => {
    fetch('/api/repair-templates')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTemplates(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const loadParts = useCallback(async () => {
    if (partsLoaded) return
    const data = await getParts()
    setCatalogueParts(data)
    setPartsLoaded(true)
  }, [partsLoaded])

  function handleSelectFault(type, fault) {
    setSelected({ type, fault })
    loadParts()
  }

  function getTemplate(type, fault) {
    return templates.find((t) => t.joinery_type === type && t.fault === fault) || null
  }

  async function handleSave(payload) {
    const res = await fetch('/api/repair-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return
    const saved = await res.json()
    setTemplates((prev) => {
      const idx = prev.findIndex(
        (t) => t.joinery_type === saved.joinery_type && t.fault === saved.fault
      )
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [...prev, saved]
    })
  }

  async function handleDelete(id) {
    const res = await fetch(`/api/repair-templates/${id}`, { method: 'DELETE' })
    if (!res.ok) return
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  const configuredCount = templates.length

  return (
    <div className="min-h-dvh bg-aq-surface lg:flex lg:flex-row lg:h-dvh lg:overflow-hidden">

      {/* Left panel — list */}
      <div className={`
        lg:w-[280px] lg:border-r lg:border-aq-border lg:overflow-y-auto lg:flex-shrink-0 lg:bg-white lg:block
        ${selected ? 'hidden' : 'block'}
        bg-aq-surface
      `}>
        {/* Header */}
        <div className="px-aq-lg pt-aq-xl pb-aq-md">
          <BackButton href="/settings" label="Settings" />
          <h1 className="text-page-title font-medium text-aq-ink mt-aq-md">Standard rates</h1>
        </div>

        {/* Progress bar */}
        <div className="px-aq-lg pb-aq-lg">
          <div className="flex items-center justify-between mb-aq-xs">
            <p className="text-caption text-aq-muted">
              {loading ? 'Loading...' : `${configuredCount} of ${TOTAL_TEMPLATE_COUNT} configured`}
            </p>
          </div>
          <div className="h-2 bg-aq-border rounded-full overflow-hidden">
            <div
              className="h-full bg-aq-green rounded-full transition-all duration-500"
              style={{ width: `${Math.round((configuredCount / TOTAL_TEMPLATE_COUNT) * 100)}%` }}
            />
          </div>
        </div>

        {/* Joinery groups */}
        <div className="pb-8">
          {REPAIR_TEMPLATE_FAULTS.map((group) => (
            <div key={group.type} className="mb-aq-sm">
              {/* Group header */}
              <div className="px-aq-lg py-aq-sm flex items-center gap-aq-sm bg-aq-surface lg:bg-white">
                <span className="text-aq-green shrink-0">
                  <JoineryIcon type={group.type} size={18} />
                </span>
                <p className="text-caption font-semibold text-aq-muted uppercase tracking-wide">
                  {group.label}
                </p>
              </div>

              {/* Fault rows */}
              {group.faults.map((fault) => {
                const tmpl = getTemplate(group.type, fault)
                const isSelected = selected?.type === group.type && selected?.fault === fault
                return (
                  <button
                    key={fault}
                    onClick={() => handleSelectFault(group.type, fault)}
                    className={`
                      w-full text-left px-aq-lg py-aq-md flex items-center justify-between gap-aq-sm
                      min-h-tap transition-colors duration-100 border-b border-aq-border/50 last:border-0
                      ${isSelected ? 'bg-aq-green-tint' : 'bg-white hover:bg-aq-surface'}
                    `}
                  >
                    <p className="text-secondary text-aq-ink flex-1 min-w-0 truncate">{fault}</p>
                    {tmpl ? <TickIcon /> : <EmptyCircleIcon />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — edit or empty state */}
      {selected ? (
        <div className="fixed inset-0 z-50 overflow-y-auto lg:static lg:z-auto lg:flex-1 lg:overflow-y-auto">
          <EditPanel
            key={`${selected.type}:${selected.fault}`}
            type={selected.type}
            fault={selected.fault}
            template={getTemplate(selected.type, selected.fault)}
            catalogueParts={catalogueParts}
            settings={settings}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={() => setSelected(null)}
          />
        </div>
      ) : (
        <div className="hidden lg:flex lg:flex-1 items-center justify-center text-aq-muted">
          <p className="text-secondary">Select a fault to configure its standard rate</p>
        </div>
      )}
    </div>
  )
}
