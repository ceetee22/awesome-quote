'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { v4 as uuidv4 } from 'uuid'
import { useSettings } from '@/lib/settings-context'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { compressImage } from '@/lib/compress-image'
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  setDefaultSupplier,
  getRepairTemplatesCount,
} from '@/lib/db'
import { TOTAL_TEMPLATE_COUNT } from '@/lib/constants'
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
  const { settings, updateSettings, settingsLoaded } = useSettings()
  const [signOutModalOpen, setSignOutModalOpen] = useState(false)
  const [templatesCount, setTemplatesCount] = useState(null)

  useEffect(() => {
    getRepairTemplatesCount().then(setTemplatesCount)
  }, [])

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient()
    if (supabase) await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const [logoUploading, setLogoUploading] = useState(false)

  const [form, setForm] = useState({
    business_name: settings.business_name,
    trading_name: settings.trading_name || '',
    legal_company_name: settings.legal_company_name || '',
    business_tagline: settings.business_tagline || '',
    contact_person_name: settings.contact_person_name || '',
    business_phone: settings.business_phone,
    business_email: settings.business_email,
    home_base_address: settings.home_base_address,
    hourly_labour_rate: String(settings.hourly_labour_rate),
    default_markup_pct: String(settings.default_markup_pct),
    gst_rate: String(settings.gst_rate),
    gst_number: settings.gst_number || '',
    bank_account_name: settings.bank_account_name || '',
    bank_name: settings.bank_name || '',
    bank_account_number: settings.bank_account_number || '',
    payment_terms: settings.payment_terms || 'Payment due on completion of work.',
    terms_and_conditions: settings.terms_and_conditions || '',
  })

  const [zones, setZones] = useState(settings.callout_zones)
  const [editingZoneId, setEditingZoneId] = useState(null)
  const [editZoneState, setEditZoneState] = useState(null)
  const [deleteZoneId, setDeleteZoneId] = useState(null)
  const [saveStatus, setSaveStatus] = useState(null) // null | 'saving' | 'saved' | 'geocode_failed'

  const [rubberWastePct, setRubberWastePct] = useState(String(settings.rubber_waste_pct ?? 10))
  const [bands, setBands] = useState(settings.window_size_bands || [])
  const [editingBandIdx, setEditingBandIdx] = useState(null)
  const [editBandState, setEditBandState] = useState(null)
  const [deleteBandIdx, setDeleteBandIdx] = useState(null)

  // Sync form fields once when DB settings land (prevents stale DEFAULT_STATE overwriting DB values)
  useEffect(() => {
    if (!settingsLoaded) return
    setForm({
      business_name: settings.business_name || '',
      trading_name: settings.trading_name || '',
      legal_company_name: settings.legal_company_name || '',
      business_tagline: settings.business_tagline || '',
      contact_person_name: settings.contact_person_name || '',
      business_phone: settings.business_phone || '',
      business_email: settings.business_email || '',
      home_base_address: settings.home_base_address || '',
      hourly_labour_rate: String(settings.hourly_labour_rate || 85),
      default_markup_pct: String(settings.default_markup_pct || 50),
      gst_rate: String(settings.gst_rate || 15),
      gst_number: settings.gst_number || '',
      bank_account_name: settings.bank_account_name || '',
      bank_name: settings.bank_name || '',
      bank_account_number: settings.bank_account_number || '',
      payment_terms: settings.payment_terms || 'Payment due on completion of work.',
      terms_and_conditions: settings.terms_and_conditions || '',
    })
    setZones(settings.callout_zones || [])
    setRubberWastePct(String(settings.rubber_waste_pct ?? 10))
    setBands(settings.window_size_bands || [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded])

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    try {
      const compressed = await compressImage(file)
      const supabase = createSupabaseBrowserClient()
      let url
      if (!supabase) {
        url = URL.createObjectURL(compressed)
      } else {
        const path = `branding/logo-${uuidv4()}.jpg`
        const { error } = await supabase.storage
          .from('job-photos')
          .upload(path, compressed, { contentType: 'image/jpeg', upsert: false })
        if (error) throw error
        const { data } = supabase.storage.from('job-photos').getPublicUrl(path)
        url = data.publicUrl
      }
      updateSettings({ logo_url: url })
    } catch (err) {
      console.error('Logo upload failed:', err)
    } finally {
      setLogoUploading(false)
    }
  }

  function handleRemoveLogo() {
    updateSettings({ logo_url: '' })
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

  async function handleSave() {
    setSaveStatus('saving')

    let homeLat = settings.home_base_lat ?? null
    let homeLng = settings.home_base_lng ?? null

    const addressChanged = form.home_base_address !== (settings.home_base_address || '')
    const coordsMissing = homeLat == null || homeLng == null

    let geocodeFailed = false
    if (form.home_base_address && (addressChanged || coordsMissing)) {
      setSaveStatus('geocoding')
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(form.home_base_address)}`)
        const data = await res.json()
        if (Array.isArray(data) && data[0]) {
          homeLat = parseFloat(data[0].lat)
          homeLng = parseFloat(data[0].lon)
        } else {
          geocodeFailed = true
        }
      } catch {
        // keep existing coords on network error
      }
    }

    updateSettings({
      business_name: form.business_name,
      trading_name: form.trading_name,
      legal_company_name: form.legal_company_name,
      business_tagline: form.business_tagline,
      contact_person_name: form.contact_person_name,
      business_phone: form.business_phone,
      business_email: form.business_email,
      home_base_address: form.home_base_address,
      home_base_lat: homeLat,
      home_base_lng: homeLng,
      hourly_labour_rate: parseFloat(form.hourly_labour_rate) || 85,
      default_markup_pct: parseFloat(form.default_markup_pct) || 50,
      gst_rate: parseFloat(form.gst_rate) || 15,
      callout_zones: zones,
      gst_number: form.gst_number,
      bank_account_name: form.bank_account_name,
      bank_name: form.bank_name,
      bank_account_number: form.bank_account_number,
      payment_terms: form.payment_terms,
      terms_and_conditions: form.terms_and_conditions,
      rubber_waste_pct: parseFloat(rubberWastePct) || 10,
      window_size_bands: bands,
    })

    setSaveStatus(geocodeFailed ? 'geocode_failed' : 'saved')
    setTimeout(() => setSaveStatus(null), 3000)
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
                  <label htmlFor="trading-name" className={labelClass}>Trading name</label>
                  <input
                    id="trading-name"
                    type="text"
                    value={form.trading_name}
                    onChange={(e) => setField('trading_name', e.target.value)}
                    placeholder="Name shown on quotes and invoices"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="legal-name" className={labelClass}>Legal company name</label>
                  <input
                    id="legal-name"
                    type="text"
                    value={form.legal_company_name}
                    onChange={(e) => setField('legal_company_name', e.target.value)}
                    placeholder="e.g. Smith Holdings Ltd"
                    className={inputClass}
                  />
                  <p className="text-caption text-aq-muted mt-aq-xs">
                    If set alongside a trading name, quotes show "[Legal name] trading as [Trading name]" in the payment section.
                  </p>
                </div>
                <div>
                  <label htmlFor="tagline" className={labelClass}>Tagline</label>
                  <input
                    id="tagline"
                    type="text"
                    value={form.business_tagline}
                    onChange={(e) => setField('business_tagline', e.target.value)}
                    placeholder="e.g. Aluminium joinery repair specialists"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="contact-person" className={labelClass}>Contact person</label>
                  <input
                    id="contact-person"
                    type="text"
                    value={form.contact_person_name}
                    onChange={(e) => setField('contact_person_name', e.target.value)}
                    placeholder="Your name"
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
                  {settings.logo_url ? (
                    <div className="flex items-start gap-aq-md">
                      <div className="w-20 h-14 rounded-aq-lg border border-aq-border bg-aq-surface flex items-center justify-center overflow-hidden shrink-0">
                        <img src={settings.logo_url} alt="Business logo" className="max-w-full max-h-full object-contain p-1" />
                      </div>
                      <div className="flex flex-col gap-aq-sm">
                        <label className="cursor-pointer">
                          <div className="inline-flex items-center justify-center min-h-tap px-aq-lg border border-aq-border rounded-aq-lg bg-white text-secondary font-medium text-aq-ink hover:bg-aq-surface transition-colors duration-150">
                            Replace logo
                          </div>
                          <input type="file" accept="image/*" className="sr-only" onChange={handleLogoUpload} />
                        </label>
                        <Button variant="destructive" onClick={handleRemoveLogo}>Remove logo</Button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <div className={`border-2 border-dashed rounded-aq-xl flex items-center justify-center min-h-[80px] bg-aq-surface transition-colors duration-150 ${logoUploading ? 'border-aq-green opacity-60' : 'border-aq-border hover:border-aq-green'}`}>
                        <p className="text-secondary text-aq-subtle select-none">
                          {logoUploading ? 'Uploading...' : 'Tap to upload logo'}
                        </p>
                      </div>
                      <input type="file" accept="image/*" className="sr-only" onChange={handleLogoUpload} disabled={logoUploading} />
                    </label>
                  )}
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
                  <label htmlFor="markup-pct" className={labelClass}>Markup on custom parts</label>
                  <SuffixInput
                    id="markup-pct"
                    suffix="%"
                    value={form.default_markup_pct}
                    onChange={(e) => setField('default_markup_pct', e.target.value)}
                    placeholder="50"
                  />
                  <p className="text-caption text-aq-muted mt-aq-xs">
                    Applied to the cost you enter when adding a manual part, to suggest a sell price. You can override the sell price.
                  </p>
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

            {/* Standard rates */}
            <Link
              href="/settings/standard-rates"
              className="bg-white border border-aq-border rounded-aq-xl p-aq-lg flex items-center justify-between gap-aq-sm min-h-tap hover:border-aq-green transition-colors duration-150"
            >
              <div>
                <p className="text-secondary font-medium text-aq-ink">Standard rates</p>
                <p className="text-caption text-aq-muted">
                  {templatesCount === null
                    ? 'Loading...'
                    : `${templatesCount} of ${TOTAL_TEMPLATE_COUNT} configured`}
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-aq-muted shrink-0">
                <path d="M6 4l4 4-4 4" />
              </svg>
            </Link>

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

            {/* Window size bands */}
            <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
              <h2 className="text-section font-medium text-aq-ink mb-aq-xs">Window size bands</h2>
              <p className="text-secondary text-aq-muted mb-aq-lg">
                Bands are your typical window sizes. Set the rubber metres and time each one usually takes so estimates are fast and accurate for your work.
              </p>
              <div className="mb-aq-md">
                <label htmlFor="rubber-waste" className={labelClass}>Rubber waste allowance</label>
                <SuffixInput
                  id="rubber-waste"
                  suffix="%"
                  value={rubberWastePct}
                  onChange={(e) => setRubberWastePct(e.target.value)}
                  placeholder="10"
                />
                <p className="text-caption text-aq-muted mt-aq-xs">Added to raw metres when calculating how much to order.</p>
              </div>
              <div className="flex flex-col gap-[10px] mb-aq-md">
                {bands.map((band, idx) => (
                  editingBandIdx === idx ? (
                    <div key={idx} className="bg-aq-green-tint border border-aq-green-tint-border rounded-aq-xl p-aq-lg flex flex-col gap-aq-sm">
                      <div>
                        <p className={labelClass}>Band name</p>
                        <input
                          type="text"
                          value={editBandState.name}
                          onChange={(e) => setEditBandState((prev) => ({ ...prev, name: e.target.value }))}
                          className={inputClass}
                        />
                      </div>
                      <div className="flex gap-aq-sm">
                        <div className="flex-1">
                          <p className={labelClass}>Perimeter (m)</p>
                          <input
                            type="number"
                            step="0.1"
                            value={editBandState.perimeter_m}
                            onChange={(e) => setEditBandState((prev) => ({ ...prev, perimeter_m: e.target.value }))}
                            className={inputClass}
                          />
                        </div>
                        <div className="flex-1">
                          <p className={labelClass}>Labour (min)</p>
                          <input
                            type="number"
                            value={editBandState.labour_min}
                            onChange={(e) => setEditBandState((prev) => ({ ...prev, labour_min: e.target.value }))}
                            className={inputClass}
                          />
                        </div>
                      </div>
                      <div className="flex gap-aq-sm">
                        <Button
                          variant="primary"
                          className="flex-1"
                          onClick={() => {
                            setBands((prev) => prev.map((b, i) =>
                              i === editingBandIdx
                                ? { name: editBandState.name, perimeter_m: parseFloat(editBandState.perimeter_m) || 0, labour_min: parseInt(editBandState.labour_min, 10) || 0 }
                                : b
                            ))
                            setEditingBandIdx(null)
                            setEditBandState(null)
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          variant="secondary"
                          className="flex-1"
                          onClick={() => { setEditingBandIdx(null); setEditBandState(null) }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div key={idx} className="bg-aq-surface border border-aq-border rounded-aq-xl p-aq-lg flex items-center justify-between gap-aq-sm">
                      <div className="flex-1 min-w-0">
                        <p className="text-secondary font-medium text-aq-ink">{band.name}</p>
                        <p className="text-caption text-aq-muted">{band.perimeter_m}m perimeter · {band.labour_min} min</p>
                      </div>
                      <div className="flex gap-aq-sm shrink-0">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditingBandIdx(idx)
                            setEditBandState({ name: band.name, perimeter_m: String(band.perimeter_m), labour_min: String(band.labour_min) })
                          }}
                        >
                          Edit
                        </Button>
                        {bands.length > 1 && (
                          <Button variant="destructive" onClick={() => setDeleteBandIdx(idx)}>
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                ))}
              </div>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  const newBand = { name: 'New size', perimeter_m: 4.0, labour_min: 20 }
                  setBands((prev) => [...prev, newBand])
                  setEditingBandIdx(bands.length)
                  setEditBandState({ name: 'New size', perimeter_m: '4.0', labour_min: '20' })
                }}
              >
                Add band
              </Button>
            </div>

            {/* Suppliers */}
            <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
              <h2 className="text-section font-medium text-aq-ink mb-aq-lg">Suppliers</h2>
              <SuppliersSection />
            </div>

            {/* Payment and terms */}
            <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
              <h2 className="text-section font-medium text-aq-ink mb-aq-lg">Payment and terms</h2>
              <div className="flex flex-col gap-aq-md">
                <div>
                  <label htmlFor="gst-number" className={labelClass}>GST number</label>
                  <input
                    id="gst-number"
                    type="text"
                    value={form.gst_number}
                    onChange={(e) => setField('gst_number', e.target.value)}
                    placeholder="123-456-789"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="bank-name" className={labelClass}>Bank name</label>
                  <input
                    id="bank-name"
                    type="text"
                    value={form.bank_name}
                    onChange={(e) => setField('bank_name', e.target.value)}
                    placeholder="e.g. ANZ, ASB, BNZ, Westpac, Kiwibank"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="bank-account-name" className={labelClass}>Account name</label>
                  <input
                    id="bank-account-name"
                    type="text"
                    value={form.bank_account_name}
                    onChange={(e) => setField('bank_account_name', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="bank-account-number" className={labelClass}>Account number</label>
                  <input
                    id="bank-account-number"
                    type="text"
                    value={form.bank_account_number}
                    onChange={(e) => setField('bank_account_number', e.target.value)}
                    placeholder="00-0000-0000000-00"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="payment-terms" className={labelClass}>Payment terms</label>
                  <textarea
                    id="payment-terms"
                    rows={3}
                    value={form.payment_terms}
                    onChange={(e) => setField('payment_terms', e.target.value)}
                    placeholder="e.g. Payment due within 7 days. Late payments may incur interest at 2% per month."
                    className="w-full bg-white border border-aq-border rounded-aq-md px-4 py-3 text-body text-aq-ink placeholder:text-aq-subtle focus:outline-none focus:border-aq-green transition-colors duration-150 resize-y"
                  />
                </div>
                <div>
                  <label htmlFor="terms-conditions" className={labelClass}>Terms and conditions</label>
                  <textarea
                    id="terms-conditions"
                    rows={6}
                    value={form.terms_and_conditions}
                    onChange={(e) => setField('terms_and_conditions', e.target.value)}
                    placeholder="Enter your terms and conditions here."
                    className="w-full bg-white border border-aq-border rounded-aq-md px-4 py-3 text-body text-aq-ink placeholder:text-aq-subtle focus:outline-none focus:border-aq-green transition-colors duration-150 resize-y"
                  />
                  <p className="text-caption text-aq-muted mt-aq-sm">
                    These appear at the bottom of every quote and invoice.
                  </p>
                </div>
              </div>
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
            <Button variant="primary" fullWidth onClick={handleSave} disabled={saveStatus === 'saving' || saveStatus === 'geocoding'}>
              {saveStatus === 'geocoding' ? 'Locating address...' : saveStatus === 'saving' ? 'Saving...' : 'Save settings'}
            </Button>
            {saveStatus === 'saved' && (
              <p className="text-secondary font-medium text-aq-green text-center">Settings saved</p>
            )}
            {saveStatus === 'geocode_failed' && (
              <p className="text-secondary text-amber-600 text-center">Address not found. Check the home base address and try again.</p>
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
        open={deleteBandIdx !== null}
        question="Delete this size band?"
        confirmLabel="Yes, delete"
        cancelLabel="Keep"
        variant="destructive"
        onConfirm={() => {
          setBands((prev) => prev.filter((_, i) => i !== deleteBandIdx))
          setDeleteBandIdx(null)
        }}
        onCancel={() => setDeleteBandIdx(null)}
      />

      <ConfirmModal
        open={signOutModalOpen}
        question="Sign out of Jotey?"
        confirmLabel="Yes, sign out"
        cancelLabel="Cancel"
        onConfirm={handleSignOut}
        onCancel={() => setSignOutModalOpen(false)}
      />
    </>
  )
}
