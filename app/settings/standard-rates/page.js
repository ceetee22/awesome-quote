'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { getParts } from '@/lib/db'
import { REPAIR_TEMPLATE_FAULTS, TOTAL_TEMPLATE_COUNT } from '@/lib/constants'
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
    case 'sliding_door':  return <SlidingDoorIcon size={size} />
    case 'bifold_door':   return <BifoldDoorIcon size={size} />
    case 'hinged_door':   return <HingedDoorIcon size={size} />
    case 'window_ali':    return <WindowAliIcon size={size} />
    case 'window_timber': return <WindowTimberIcon size={size} />
    default: return null
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'custom'
}

// ─── Tick / empty circle indicators ──────────────────────────────────────────

function TickIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="#22A67A" />
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

function ChevronRight() {
  return (
    <svg width="7" height="11" viewBox="0 0 7 11" fill="none" aria-hidden="true">
      <path d="M1 1l5 4.5-5 4.5" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Stepper button ───────────────────────────────────────────────────────────

const stepBtnStyle = {
  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
  border: '1px solid #E4EAE8', borderRadius: 6, background: 'white', cursor: 'pointer', flexShrink: 0,
  fontSize: 18, color: '#4A5B68',
}

// ─── Edit panel ───────────────────────────────────────────────────────────────

function EditPanel({ type, fault, isCustom, customName, template, catalogueParts, onSave, onDelete, onClose }) {
  const [price, setPrice] = useState('')
  const [selectedParts, setSelectedParts] = useState([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setPrice(template?.price != null ? String(template.price) : '')
    setSelectedParts(template?.parts ? [...template.parts] : [])
    setSearch('')
    setSaved(false)
  }, [type, fault, template?.id])

  const filteredParts = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return catalogueParts.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6)
  }, [search, catalogueParts])

  function addPart(part) {
    setSelectedParts((prev) => {
      const existing = prev.find((p) => p.part_id === part.id)
      if (existing) return prev.map((p) => p.part_id === part.id ? { ...p, qty: p.qty + 1 } : p)
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

  async function handleSave() {
    setSaving(true)
    await onSave({
      joinery_type: type,
      fault,
      price: price === '' ? null : parseFloat(price),
      parts: selectedParts,
      is_custom: isCustom || false,
      custom_name: customName || null,
    })
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
  const displayName = isCustom ? customName : fault

  return (
    <div style={{ minHeight: '100dvh', background: '#fff' }} className="lg:min-h-0">

      {/* Dark header */}
      <div style={{ background: '#1F2D37', padding: '20px 16px 22px' }}>
        <button
          onClick={onClose}
          className="lg:hidden"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: 'rgba(255,255,255,0.7)', fontSize: 14, background: 'none',
            border: 'none', cursor: 'pointer', padding: 0, marginBottom: 18,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 12L6 8l4-4" />
          </svg>
          {groupLabel}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(34,166,122,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#22A67A' }}>
              <JoineryIcon type={type} size={22} />
            </span>
          </div>
          <div>
            <p style={{ color: '#fff', fontSize: 16, fontWeight: 500, margin: 0, lineHeight: 1.3 }}>
              {groupLabel}, {displayName}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: '3px 0 0' }}>
              Set your standard rate for this repair
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 16px 48px', maxWidth: 600 }}>

        {/* Standard price */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#1F2D37', margin: '0 0 8px' }}>Standard price</p>
          <div style={{ display: 'flex', alignItems: 'stretch', border: '2px solid #22A67A', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
            <span style={{
              padding: '0 16px', fontSize: 22, color: '#4A5B68', fontWeight: 500,
              background: '#F6F8F7', borderRight: '1px solid #E4EAE8',
              display: 'flex', alignItems: 'center', flexShrink: 0,
            }}>$</span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              style={{
                flex: 1, fontSize: 24, fontWeight: 500, border: 'none', outline: 'none',
                padding: '14px 16px', color: '#1F2D37', background: 'transparent', minHeight: 58,
              }}
            />
          </div>
          <p style={{ fontSize: 13, color: '#8CA3A0', margin: '6px 0 0' }}>GST inclusive. This is what the customer pays.</p>
        </div>

        {/* Default parts (optional) */}
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#1F2D37', margin: '0 0 2px' }}>
            Default parts{' '}
            <span style={{ fontWeight: 400, color: '#8CA3A0', fontSize: 13 }}>(optional, for ordering)</span>
          </p>
          <p style={{ fontSize: 13, color: '#8CA3A0', fontStyle: 'italic', margin: '0 0 12px', lineHeight: 1.5 }}>
            These auto-add to purchase orders. They don't change the price above.
          </p>

          {selectedParts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {selectedParts.map((p) => (
                <div
                  key={p.part_id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: '#E6F7F0', border: '1px solid #C5E8D5',
                    borderRadius: 8, padding: '10px 12px',
                  }}
                >
                  <p style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#1F2D37', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => updateQty(p.part_id, -1)} style={stepBtnStyle} aria-label="Decrease quantity">−</button>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#1F2D37', minWidth: 24, textAlign: 'center' }}>{p.qty}</span>
                    <button onClick={() => updateQty(p.part_id, 1)} style={stepBtnStyle} aria-label="Increase quantity">+</button>
                    <button
                      onClick={() => removePart(p.part_id)}
                      style={{ ...stepBtnStyle, marginLeft: 4, color: '#8CA3A0' }}
                      aria-label="Remove part"
                    >×</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Part search */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={catalogueParts.length === 0 ? 'Loading parts...' : 'Search parts to add'}
              disabled={catalogueParts.length === 0}
              style={{
                width: '100%', border: '1px solid #E4EAE8', borderRadius: 8,
                minHeight: 48, padding: '0 14px', fontSize: 16, color: '#1F2D37',
                background: '#fff', outline: 'none', boxSizing: 'border-box',
              }}
            />
            {filteredParts.length > 0 && (
              <div style={{
                position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4,
                background: '#fff', border: '1px solid #E4EAE8', borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 10, overflow: 'hidden',
              }}>
                {filteredParts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addPart(p)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '12px 14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: 8, background: '#fff', border: 'none',
                      borderBottom: '1px solid #F6F8F7', cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 15, color: '#1F2D37', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <span style={{ fontSize: 13, color: '#8CA3A0', flexShrink: 0 }}>${(p.sell_price || 0).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button variant="primary" fullWidth onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save standard rate'}
          </Button>
          {template && (
            <button
              onClick={() => setDeleteOpen(true)}
              style={{
                minHeight: 44, border: 'none', background: 'none',
                color: '#D94444', fontSize: 15, cursor: 'pointer', padding: '8px 0',
              }}
            >
              Delete this rate
            </button>
          )}
        </div>
      </div>

      <ConfirmModal
        open={deleteOpen}
        question="Delete this rate?"
        confirmLabel="Yes, delete"
        cancelLabel="Keep"
        variant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StandardRatesPage() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [catalogueParts, setCatalogueParts] = useState([])
  const [partsLoaded, setPartsLoaded] = useState(false)
  const [selected, setSelected] = useState(null) // { type, fault, isCustom, customName }
  const [addCustomModal, setAddCustomModal] = useState(null) // { type, groupLabel }
  const [customNameInput, setCustomNameInput] = useState('')

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

  function handleSelectFault(type, fault, isCustom = false, customName = null) {
    setSelected({ type, fault, isCustom, customName })
    loadParts()
  }

  function handleAddCustomClick(type, groupLabel) {
    setAddCustomModal({ type, groupLabel })
    setCustomNameInput('')
  }

  function handleCustomNameSubmit() {
    if (!addCustomModal) return
    const name = customNameInput.trim()
    if (!name) return
    const fault = slugify(name)
    const existing = templates.find(
      (t) => t.is_custom && t.joinery_type === addCustomModal.type && t.fault === fault
    )
    setSelected({
      type: addCustomModal.type,
      fault,
      isCustom: true,
      customName: existing ? existing.custom_name : name,
    })
    setAddCustomModal(null)
    loadParts()
  }

  function getTemplate(type, fault) {
    return templates.find((t) => t.joinery_type === type && t.fault === fault) || null
  }

  function getCustomTemplates(type) {
    return templates.filter((t) => t.is_custom && t.joinery_type === type)
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
    setSelected(null)
  }

  const builtInConfigured = templates.filter((t) => !t.is_custom).length

  return (
    <div className="min-h-dvh bg-aq-surface lg:flex lg:flex-row lg:h-dvh lg:overflow-hidden">

      {/* Left panel — fault list */}
      <div className={`
        lg:w-[260px] lg:border-r lg:border-aq-border lg:overflow-y-auto lg:flex-shrink-0 lg:bg-white lg:block
        ${selected ? 'hidden' : 'block'} bg-aq-surface
      `}>
        <div className="px-aq-lg pt-aq-xl pb-aq-md">
          <BackButton href="/settings" label="Settings" />
          <h1 className="text-page-title font-medium text-aq-ink mt-aq-md">Standard rates</h1>
        </div>

        {/* Progress */}
        <div className="px-aq-lg pb-aq-lg">
          <p className="text-caption text-aq-muted mb-aq-xs">
            {loading ? 'Loading...' : `${builtInConfigured} of ${TOTAL_TEMPLATE_COUNT} configured`}
          </p>
          <div className="h-2 bg-aq-border rounded-full overflow-hidden">
            <div
              className="h-full bg-aq-green rounded-full transition-all duration-500"
              style={{ width: `${loading ? 0 : Math.round((builtInConfigured / TOTAL_TEMPLATE_COUNT) * 100)}%` }}
            />
          </div>
        </div>

        {/* Joinery groups */}
        <div className="pb-8">
          {REPAIR_TEMPLATE_FAULTS.map((group) => {
            const customTemplates = getCustomTemplates(group.type)
            return (
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

                {/* Built-in fault rows */}
                {group.faults.map((fault) => {
                  const tmpl = getTemplate(group.type, fault)
                  const isSelected = selected?.type === group.type && selected?.fault === fault && !selected?.isCustom
                  return (
                    <button
                      key={fault}
                      onClick={() => handleSelectFault(group.type, fault)}
                      className={`w-full text-left px-aq-lg flex items-center gap-aq-sm min-h-tap transition-colors duration-100 border-b border-aq-border/50 ${isSelected ? 'bg-aq-green-tint' : 'bg-white hover:bg-aq-surface'}`}
                      style={{ paddingTop: 10, paddingBottom: 10 }}
                    >
                      <span className="shrink-0">{tmpl ? <TickIcon /> : <EmptyCircleIcon />}</span>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#1F2D37', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {fault}
                      </span>
                      {tmpl?.price != null && (
                        <span style={{ fontSize: 12, color: '#22A67A', flexShrink: 0, whiteSpace: 'nowrap' }}>
                          ${Number(tmpl.price).toFixed(2)} incl GST
                        </span>
                      )}
                      <ChevronRight />
                    </button>
                  )
                })}

                {/* Custom repair type rows */}
                {customTemplates.map((tmpl) => {
                  const isSelected = selected?.type === group.type && selected?.fault === tmpl.fault
                  return (
                    <button
                      key={tmpl.id}
                      onClick={() => handleSelectFault(group.type, tmpl.fault, true, tmpl.custom_name)}
                      className={`w-full text-left px-aq-lg flex items-center gap-aq-sm min-h-tap transition-colors duration-100 border-b border-aq-border/50 ${isSelected ? 'bg-aq-green-tint' : 'bg-white hover:bg-aq-surface'}`}
                      style={{ paddingTop: 10, paddingBottom: 10 }}
                    >
                      <span className="shrink-0"><TickIcon /></span>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#22A67A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tmpl.custom_name}
                      </span>
                      {tmpl.price != null && (
                        <span style={{ fontSize: 12, color: '#22A67A', flexShrink: 0, whiteSpace: 'nowrap' }}>
                          ${Number(tmpl.price).toFixed(2)} incl GST
                        </span>
                      )}
                      <ChevronRight />
                    </button>
                  )
                })}

                {/* Add custom repair type */}
                <button
                  onClick={() => handleAddCustomClick(group.type, group.label)}
                  className="w-full flex items-center justify-center gap-2 min-h-tap bg-white hover:bg-aq-surface transition-colors"
                  style={{ border: 'none', borderBottom: '1.5px dashed #E4EAE8', cursor: 'pointer', padding: '0 16px' }}
                >
                  <span style={{ fontSize: 20, color: '#22A67A', fontWeight: 400, lineHeight: 1 }}>+</span>
                  <span style={{ fontSize: 14, color: '#22A67A', fontWeight: 500 }}>Add custom repair type</span>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right panel — config or empty state */}
      {selected ? (
        <div className="fixed inset-0 z-50 overflow-y-auto lg:static lg:z-auto lg:flex-1 lg:overflow-y-auto">
          <EditPanel
            key={`${selected.type}:${selected.fault}`}
            type={selected.type}
            fault={selected.fault}
            isCustom={selected.isCustom}
            customName={selected.customName}
            template={getTemplate(selected.type, selected.fault)}
            catalogueParts={catalogueParts}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={() => setSelected(null)}
          />
        </div>
      ) : (
        <div className="hidden lg:flex lg:flex-1 items-center justify-center">
          <p className="text-secondary text-aq-muted">Select a repair type to set its standard rate</p>
        </div>
      )}

      {/* Add custom type modal */}
      {addCustomModal && (
        <div
          onClick={() => setAddCustomModal(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(31,45,55,0.5)',
            zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '12px 12px 0 0', padding: '24px 20px 36px', width: '100%', maxWidth: 480 }}
          >
            <p style={{ fontSize: 18, fontWeight: 500, color: '#1F2D37', margin: '0 0 4px' }}>Add custom repair type</p>
            <p style={{ fontSize: 14, color: '#8CA3A0', margin: '0 0 20px' }}>{addCustomModal.groupLabel}</p>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#4A5B68', marginBottom: 8 }}>
              Repair name
            </label>
            <input
              type="text"
              value={customNameInput}
              onChange={(e) => setCustomNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCustomNameSubmit() }}
              placeholder="e.g. Full track service"
              autoFocus
              style={{
                width: '100%', border: '1px solid #E4EAE8', borderRadius: 8,
                minHeight: 48, padding: '0 14px', fontSize: 16, color: '#1F2D37',
                background: '#fff', outline: 'none', boxSizing: 'border-box', marginBottom: 16,
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setAddCustomModal(null)}
                style={{ flex: 1, minHeight: 48, border: '1px solid #E4EAE8', borderRadius: 10, background: '#fff', color: '#4A5B68', fontSize: 16, fontWeight: 500, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCustomNameSubmit}
                disabled={!customNameInput.trim()}
                style={{
                  flex: 2, minHeight: 48, border: 'none', borderRadius: 10,
                  background: '#22A67A', color: '#fff', fontSize: 16, fontWeight: 500,
                  cursor: customNameInput.trim() ? 'pointer' : 'default',
                  opacity: customNameInput.trim() ? 1 : 0.5,
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
