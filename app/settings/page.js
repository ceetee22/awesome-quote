'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { useSettings } from '@/lib/settings-context'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  setDefaultSupplier,
} from '@/lib/db'
import Button from '@/components/Button'
import BackButton from '@/components/BackButton'
import ConfirmModal from '@/components/ConfirmModal'

const inputClass =
  'w-full bg-white border border-aq-border rounded-aq-md min-h-tap px-4 text-body text-aq-ink placeholder:text-aq-subtle focus:outline-none focus:border-aq-green transition-colors duration-150'

const labelClass = 'block text-secondary text-aq-muted mb-aq-sm'

function PrefixInput({ id, prefix, value, onChange, placeholder, type = 'number' }) {
  return (
    <div className="flex items-stretch border border-aq-border rounded-aq-md overflow-hidden min-h-tap focus-within:border-aq-green transition-colors duration-150 bg-white">
      <span className="px-3 flex items-center text-body text-aq-muted bg-aq-surface border-r border-aq-border shrink-0">
        {prefix}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="flex-1 px-3 text-body text-aq-ink bg-white focus:outline-none min-w-0"
      />
    </div>
  )
}

function SuffixInput({ id, suffix, value, onChange, placeholder }) {
  return (
    <div className="flex items-stretch border border-aq-border rounded-aq-md overflow-hidden min-h-tap focus-within:border-aq-green transition-colors duration-150 bg-white">
      <input
        id={id}
        type="number"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="flex-1 px-3 text-body text-aq-ink bg-white focus:outline-none min-w-0"
      />
      <span className="px-3 flex items-center text-body text-aq-muted bg-aq-surface border-l border-aq-border shrink-0">
        {suffix}
      </span>
    </div>
  )
}

function ZoneCard({ zone, isEditing, onEdit, onSaveEdit, onCancelEdit, onDelete, canDelete, editState, onEditChange }) {
  if (isEditing && editState) {
    return (
      <div className="bg-aq-green-tint border border-aq-green-tint-border rounded-aq-xl p-aq-lg flex flex-col gap-aq-sm">
        <div>
          <p className={labelClass}>Zone name</p>
          <input
            type="text"
            value={editState.name}
            onChange={(e) => onEditChange('name', e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex gap-aq-sm">
          <div className="flex-1">
            <p className={labelClass}>From (km)</p>
            <input
              type="number"
              value={editState.min_km}
              onChange={(e) => onEditChange('min_km', e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex-1">
            <p className={labelClass}>To (km)</p>
            <input
              type="number"
              value={editState.max_km}
              onChange={(e) => onEditChange('max_km', e.target.value)}
              placeholder="No limit"
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <p className={labelClass}>Fee</p>
          <PrefixInput
            prefix="$"
            value={editState.fee}
            onChange={(e) => onEditChange('fee', e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="flex gap-aq-sm">
          <Button variant="primary" className="flex-1" onClick={onSaveEdit}>
            Save
          </Button>
          <Button variant="secondary" className="flex-1" onClick={onCancelEdit}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  const distanceLabel =
    zone.max_km != null ? `${zone.min_km} to ${zone.max_km} km` : `${zone.min_km}+ km`

  return (
    <div className="bg-aq-surface border border-aq-border rounded-aq-xl p-aq-lg flex items-center justify-between gap-aq-sm">
      <div className="flex-1 min-w-0">
        <p className="text-secondary font-medium text-aq-ink">{zone.name}</p>
        <p className="text-caption text-aq-muted">{distanceLabel}</p>
        <p className="text-secondary font-medium text-aq-green mt-aq-xs">${zone.fee.toFixed(2)}</p>
      </div>
      <div className="flex gap-aq-sm shrink-0">
        <Button variant="secondary" onClick={onEdit}>
          Edit
        </Button>
        {canDelete && (
          <Button variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        )}
      </div>
    </div>
  )
}

const EMPTY_SUPPLIER = { name: '', email: '', phone: '', contact_person: '', notes: '' }

function SuppliersSection() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editState, setEditState] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addState, setAddState] = useState(EMPTY_SUPPLIER)
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    getSuppliers().then((data) => { setSuppliers(data); setLoading(false) })
  }, [])

  function startEdit(supplier) {
    setEditingId(supplier.id)
    setEditState({
      name: supplier.name || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      contact_person: supplier.contact_person || '',
      notes: supplier.notes || '',
    })
  }

  async function saveEdit() {
    await updateSupplier(editingId, editState)
    setSuppliers((prev) => prev.map((s) => s.id === editingId ? { ...s, ...editState } : s))
    setEditingId(null)
    setEditState(null)
  }

  async function handleSetDefault(id) {
    await setDefaultSupplier(id)
    setSuppliers((prev) => prev.map((s) => ({ ...s, is_default: s.id === id })))
  }

  async function confirmDelete() {
    await deleteSupplier(deleteId)
    setSuppliers((prev) => prev.filter((s) => s.id !== deleteId))
    setDeleteId(null)
  }

  async function handleAdd() {
    if (!addState.name.trim()) return
    await createSupplier({ ...addState })
    const updated = await getSuppliers()
    setSuppliers(updated)
    setAddOpen(false)
    setAddState(EMPTY_SUPPLIER)
  }

  const supplierFields = (state, onChange) => (
    <div className="flex flex-col gap-aq-sm">
      <div>
        <p className={labelClass}>Name</p>
        <input type="text" value={state.name} onChange={(e) => onChange('name', e.target.value)} className={inputClass} />
      </div>
      <div>
        <p className={labelClass}>Email</p>
        <input type="email" value={state.email} onChange={(e) => onChange('email', e.target.value)} placeholder="orders@supplier.co.nz" className={inputClass} />
      </div>
      <div>
        <p className={labelClass}>Phone</p>
        <input type="tel" value={state.phone} onChange={(e) => onChange('phone', e.target.value)} placeholder="e.g. 09 123 4567" className={inputClass} />
      </div>
      <div>
        <p className={labelClass}>Contact person</p>
        <input type="text" value={state.contact_person} onChange={(e) => onChange('contact_person', e.target.value)} className={inputClass} />
      </div>
      <div>
        <p className={labelClass}>Notes</p>
        <input type="text" value={state.notes} onChange={(e) => onChange('notes', e.target.value)} className={inputClass} />
      </div>
    </div>
  )

  if (loading) {
    return <p className="text-secondary text-aq-muted">Loading suppliers...</p>
  }

  return (
    <>
      <div className="flex flex-col gap-[10px]">
        {suppliers.map((supplier) => (
          <div key={supplier.id} className={`bg-aq-surface border rounded-aq-xl p-aq-lg ${editingId === supplier.id ? 'border-aq-green bg-aq-green-tint' : 'border-aq-border'}`}>
            {editingId === supplier.id && editState ? (
              <>
                {supplierFields(editState, (key, val) => setEditState((prev) => ({ ...prev, [key]: val })))}
                <div className="flex gap-aq-sm mt-aq-md">
                  <Button variant="primary" className="flex-1" onClick={saveEdit}>Save</Button>
                  <Button variant="secondary" className="flex-1" onClick={() => { setEditingId(null); setEditState(null) }}>Cancel</Button>
                </div>
              </>
            ) : (
              <div className="flex items-start justify-between gap-aq-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-aq-sm mb-aq-xs">
                    <p className="text-secondary font-medium text-aq-ink">{supplier.name}</p>
                    {supplier.is_default && (
                      <span className="text-caption font-medium text-aq-green bg-aq-green-tint border border-aq-green-tint-border px-2 py-0.5 rounded-aq-sm">Default</span>
                    )}
                  </div>
                  {supplier.email && <p className="text-caption text-aq-muted">{supplier.email}</p>}
                  {supplier.phone && <p className="text-caption text-aq-muted">{supplier.phone}</p>}
                </div>
                <div className="flex flex-col gap-aq-xs shrink-0">
                  <Button variant="secondary" onClick={() => startEdit(supplier)}>Edit</Button>
                  {!supplier.is_default && (
                    <Button variant="secondary" onClick={() => handleSetDefault(supplier.id)}>Set default</Button>
                  )}
                  {!supplier.is_default && (
                    <Button variant="destructive" onClick={() => setDeleteId(supplier.id)}>Remove</Button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add supplier */}
        {addOpen ? (
          <div className="bg-aq-green-tint border border-aq-green-tint-border rounded-aq-xl p-aq-lg">
            {supplierFields(addState, (key, val) => setAddState((prev) => ({ ...prev, [key]: val })))}
            <div className="flex gap-aq-sm mt-aq-md">
              <Button variant="primary" className="flex-1" onClick={handleAdd} disabled={!addState.name.trim()}>Add</Button>
              <Button variant="secondary" className="flex-1" onClick={() => { setAddOpen(false); setAddState(EMPTY_SUPPLIER) }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" fullWidth onClick={() => setAddOpen(true)}>Add supplier</Button>
        )}
      </div>

      <ConfirmModal
        open={!!deleteId}
        question="Remove this supplier?"
        confirmLabel="Yes, remove"
        cancelLabel="Keep"
        variant="destructive"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const { settings, updateSettings } = useSettings()
  const [signOutModalOpen, setSignOutModalOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient()
    if (supabase) await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const [form, setForm] = useState({
    business_name: settings.business_name,
    business_phone: settings.business_phone,
    business_email: settings.business_email,
    home_base_address: settings.home_base_address,
    hourly_labour_rate: String(settings.hourly_labour_rate),
    default_markup_pct: String(settings.default_markup_pct),
    gst_rate: String(settings.gst_rate),
  })

  const [zones, setZones] = useState(settings.callout_zones)
  const [editingZoneId, setEditingZoneId] = useState(null)
  const [editZoneState, setEditZoneState] = useState(null)
  const [deleteZoneId, setDeleteZoneId] = useState(null)
  const [savedVisible, setSavedVisible] = useState(false)

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function startEditZone(zone) {
    setEditingZoneId(zone.id)
    setEditZoneState({
      name: zone.name,
      min_km: String(zone.min_km),
      max_km: zone.max_km != null ? String(zone.max_km) : '',
      fee: String(zone.fee),
    })
  }

  function saveEditZone() {
    setZones((prev) =>
      prev.map((z) => {
        if (z.id !== editingZoneId) return z
        return {
          ...z,
          name: editZoneState.name,
          min_km: parseFloat(editZoneState.min_km) || 0,
          max_km: editZoneState.max_km === '' ? null : parseFloat(editZoneState.max_km),
          fee: parseFloat(editZoneState.fee) || 0,
        }
      })
    )
    setEditingZoneId(null)
    setEditZoneState(null)
  }

  function cancelEditZone() {
    setEditingZoneId(null)
    setEditZoneState(null)
  }

  function addZone() {
    const newZone = { id: uuidv4(), name: 'New zone', min_km: 0, max_km: null, fee: 0 }
    setZones((prev) => [...prev, newZone])
    startEditZone(newZone)
  }

  function confirmDeleteZone() {
    setZones((prev) => prev.filter((z) => z.id !== deleteZoneId))
    setDeleteZoneId(null)
  }

  function handleSave() {
    updateSettings({
      business_name: form.business_name,
      business_phone: form.business_phone,
      business_email: form.business_email,
      home_base_address: form.home_base_address,
      hourly_labour_rate: parseFloat(form.hourly_labour_rate) || 85,
      default_markup_pct: parseFloat(form.default_markup_pct) || 50,
      gst_rate: parseFloat(form.gst_rate) || 15,
      callout_zones: zones,
    })
    setSavedVisible(true)
    setTimeout(() => setSavedVisible(false), 2000)
  }

  return (
    <>
      <div className="min-h-dvh bg-aq-surface">
        <div className="max-w-[480px] mx-auto px-aq-lg pb-[88px]">

          {/* Header */}
          <div className="flex items-center gap-aq-sm py-aq-xl">
            <BackButton href="/" label="Home" />
            <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm">Settings</h1>
          </div>

          <div className="flex flex-col gap-aq-lg">

            {/* Business details */}
            <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
              <h2 className="text-section font-medium text-aq-ink mb-aq-lg">Business details</h2>
              <div className="flex flex-col gap-aq-md">
                <div>
                  <label htmlFor="biz-name" className={labelClass}>Business name</label>
                  <input
                    id="biz-name"
                    type="text"
                    value={form.business_name}
                    onChange={(e) => setField('business_name', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="biz-phone" className={labelClass}>Phone</label>
                  <input
                    id="biz-phone"
                    type="tel"
                    value={form.business_phone}
                    onChange={(e) => setField('business_phone', e.target.value)}
                    placeholder="e.g. 021 123 4567"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="biz-email" className={labelClass}>Email</label>
                  <input
                    id="biz-email"
                    type="email"
                    value={form.business_email}
                    onChange={(e) => setField('business_email', e.target.value)}
                    placeholder="e.g. info@example.co.nz"
                    className={inputClass}
                  />
                </div>
                <div>
                  <p className={labelClass}>Logo</p>
                  <div className="border-2 border-dashed border-aq-border rounded-aq-xl flex items-center justify-center min-h-[96px] bg-aq-surface cursor-not-allowed">
                    <p className="text-secondary text-aq-subtle">Tap to upload logo</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
              <h2 className="text-section font-medium text-aq-ink mb-aq-lg">Pricing</h2>
              <div className="flex flex-col gap-aq-md">
                <div>
                  <label htmlFor="hourly-rate" className={labelClass}>Hourly labour rate</label>
                  <PrefixInput
                    id="hourly-rate"
                    prefix="$"
                    value={form.hourly_labour_rate}
                    onChange={(e) => setField('hourly_labour_rate', e.target.value)}
                    placeholder="85"
                  />
                </div>
                <div>
                  <label htmlFor="markup-pct" className={labelClass}>Default parts markup</label>
                  <SuffixInput
                    id="markup-pct"
                    suffix="%"
                    value={form.default_markup_pct}
                    onChange={(e) => setField('default_markup_pct', e.target.value)}
                    placeholder="50"
                  />
                </div>
                <div>
                  <label htmlFor="gst-rate" className={labelClass}>GST rate</label>
                  <SuffixInput
                    id="gst-rate"
                    suffix="%"
                    value={form.gst_rate}
                    onChange={(e) => setField('gst_rate', e.target.value)}
                    placeholder="15"
                  />
                </div>
              </div>
            </div>

            {/* Callout zones */}
            <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
              <h2 className="text-section font-medium text-aq-ink mb-aq-md">Callout zones</h2>
              <div className="mb-aq-md">
                <label htmlFor="home-base" className={labelClass}>Home base address</label>
                <input
                  id="home-base"
                  type="text"
                  value={form.home_base_address}
                  onChange={(e) => setField('home_base_address', e.target.value)}
                  placeholder="e.g. 12 Main St, Papakura"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-[10px] mb-aq-md">
                {zones.map((zone) => (
                  <ZoneCard
                    key={zone.id}
                    zone={zone}
                    isEditing={editingZoneId === zone.id}
                    onEdit={() => startEditZone(zone)}
                    onSaveEdit={saveEditZone}
                    onCancelEdit={cancelEditZone}
                    onDelete={() => setDeleteZoneId(zone.id)}
                    canDelete={zones.length > 1}
                    editState={editZoneState}
                    onEditChange={(key, value) =>
                      setEditZoneState((prev) => ({ ...prev, [key]: value }))
                    }
                  />
                ))}
              </div>
              <Button variant="secondary" fullWidth onClick={addZone}>
                Add zone
              </Button>
            </div>

            {/* Suppliers */}
            <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
              <h2 className="text-section font-medium text-aq-ink mb-aq-lg">Suppliers</h2>
              <SuppliersSection />
            </div>

            {/* Xero */}
            <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
              <h2 className="text-section font-medium text-aq-ink mb-aq-sm">Xero connection</h2>
              <p className="text-secondary text-aq-muted mb-aq-lg">
                Link your Xero account to send invoices directly.
              </p>
              <Button variant="secondary" fullWidth>
                Connect to Xero
              </Button>
            </div>

          </div>

          {/* Save */}
          <div className="mt-aq-2xl flex flex-col gap-aq-sm">
            <Button variant="primary" fullWidth onClick={handleSave}>
              Save settings
            </Button>
            {savedVisible && (
              <p className="text-secondary font-medium text-aq-green text-center">
                Settings saved
              </p>
            )}
          </div>

          {/* Sign out */}
          <div className="mt-aq-xl mb-8">
            <Button variant="destructive" fullWidth onClick={() => setSignOutModalOpen(true)}>
              Sign out
            </Button>
          </div>

        </div>
      </div>

      <ConfirmModal
        open={!!deleteZoneId}
        question="Delete this callout zone?"
        confirmLabel="Yes, delete"
        cancelLabel="Keep"
        variant="destructive"
        onConfirm={confirmDeleteZone}
        onCancel={() => setDeleteZoneId(null)}
      />

      <ConfirmModal
        open={signOutModalOpen}
        question="Sign out of Awesome Quote?"
        confirmLabel="Yes, sign out"
        cancelLabel="Cancel"
        onConfirm={handleSignOut}
        onCancel={() => setSignOutModalOpen(false)}
      />
    </>
  )
}
