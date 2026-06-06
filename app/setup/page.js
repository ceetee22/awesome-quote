'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSettings } from '@/lib/settings-context'
import { updateBusiness, saveSettings } from '@/lib/db'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { v4 as uuidv4 } from 'uuid'

const inputClass = 'w-full bg-white border border-aq-border rounded-aq-md min-h-tap px-4 text-body text-aq-ink placeholder:text-aq-subtle focus:outline-none focus:border-aq-green transition-colors duration-150'
const labelClass = 'block text-secondary text-aq-muted mb-aq-sm'

const TOTAL_STEPS = 6

function ProgressDots({ current }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 32 }}>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div key={i} style={{
          width: i === current - 1 ? 20 : 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: i < current ? '#22A67A' : i === current - 1 ? '#22A67A' : '#E4EAE8',
          transition: 'all 0.2s',
        }} />
      ))}
    </div>
  )
}

export default function SetupPage() {
  const router = useRouter()
  const { settings, settingsLoaded, updateSettings } = useSettings()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)

  const [bizName, setBizName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  const [hourlyRate, setHourlyRate] = useState('85')
  const [markupPct, setMarkupPct] = useState('30')
  const [gstRate, setGstRate] = useState('15')

  const [homeAddress, setHomeAddress] = useState('')
  const [homeLat, setHomeLat] = useState(null)
  const [homeLng, setHomeLng] = useState(null)
  const [geoError, setGeoError] = useState('')

  const [zones, setZones] = useState([
    { id: 'local', name: 'Local', min_km: 0, max_km: 15, fee: 50 },
    { id: 'mid', name: 'Mid-range', min_km: 15, max_km: 30, fee: 75 },
    { id: 'far', name: 'Far', min_km: 30, max_km: null, fee: 100 },
  ])

  const [supplierName, setSupplierName] = useState('Joinery Hardware NZ')
  const [supplierEmail, setSupplierEmail] = useState('')

  useEffect(() => {
    if (!settingsLoaded) return
    if (settings.setup_complete) {
      router.replace('/')
      return
    }
    setBizName(settings.business_name || '')
    setContactEmail(settings.business_email || '')
    setContactPhone(settings.business_phone || '')
    setHourlyRate(String(settings.hourly_labour_rate || 85))
    setMarkupPct(String(settings.default_markup_pct || 30))
    setGstRate(String(settings.gst_rate || 15))
    setHomeAddress(settings.home_base_address || '')
    if (settings.home_base_lat) setHomeLat(settings.home_base_lat)
    if (settings.home_base_lng) setHomeLng(settings.home_base_lng)
    if (settings.callout_zones?.length > 0) setZones(settings.callout_zones)
    setSupplierName(settings.supplier_name || 'Joinery Hardware NZ')
    setSupplierEmail(settings.supplier_email || '')
  }, [settingsLoaded])

  async function geocode(address) {
    if (!address.trim()) return
    setGeoLoading(true)
    setGeoError('')
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(address)}`)
      const data = await res.json()
      if (data[0]) {
        setHomeLat(parseFloat(data[0].lat))
        setHomeLng(parseFloat(data[0].lon))
      } else {
        setGeoError('Address not found. Try a more specific address.')
      }
    } catch {
      setGeoError('Could not look up address. You can continue and update it in settings.')
    } finally {
      setGeoLoading(false)
    }
  }

  async function saveStep(stepNum) {
    setSaving(true)
    try {
      if (stepNum === 1) {
        await updateBusiness({ name: bizName, contact_email: contactEmail, contact_phone: contactPhone })
        updateSettings({ business_name: bizName, business_email: contactEmail, business_phone: contactPhone })
      } else if (stepNum === 2) {
        await updateBusiness({
          hourly_labour_rate: parseFloat(hourlyRate) || 85,
          default_markup_pct: parseFloat(markupPct) || 30,
          gst_rate: parseFloat(gstRate) || 15,
        })
        updateSettings({ hourly_labour_rate: parseFloat(hourlyRate) || 85, default_markup_pct: parseFloat(markupPct) || 30, gst_rate: parseFloat(gstRate) || 15 })
      } else if (stepNum === 3) {
        await updateBusiness({ home_base_address: homeAddress, home_base_lat: homeLat, home_base_lng: homeLng })
        updateSettings({ home_base_address: homeAddress, home_base_lat: homeLat, home_base_lng: homeLng })
      } else if (stepNum === 4) {
        const supabase = createSupabaseBrowserClient()
        if (supabase) {
          await supabase.from('callout_zones').delete().neq('id', '__never__')
          const rows = zones.map((z, i) => ({ ...z, sort_order: i }))
          await supabase.from('callout_zones').insert(rows)
        }
        updateSettings({ callout_zones: zones })
      } else if (stepNum === 5) {
        await updateBusiness({ supplier_name: supplierName, supplier_email: supplierEmail })
        updateSettings({ supplier_name: supplierName, supplier_email: supplierEmail })
      } else if (stepNum === 6) {
        await updateBusiness({ setup_complete: true })
        updateSettings({ setup_complete: true })
        router.push('/')
        router.refresh()
        return
      }
      setStep(stepNum + 1)
    } finally {
      setSaving(false)
    }
  }

  function updateZone(index, field, value) {
    setZones(prev => prev.map((z, i) => i === index ? { ...z, [field]: value } : z))
  }

  function addZone() {
    setZones(prev => [...prev, { id: uuidv4(), name: '', min_km: 0, max_km: null, fee: 0 }])
  }

  function removeZone(index) {
    setZones(prev => prev.filter((_, i) => i !== index))
  }

  if (!settingsLoaded) {
    return (
      <div style={{ minHeight: '100dvh', background: '#F6F8F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#8CA3A0', fontSize: 16 }}>Loading...</p>
      </div>
    )
  }

  const pageStyle = { minHeight: '100dvh', background: '#F6F8F7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }
  const cardStyle = { width: '100%', maxWidth: 440, background: '#FFFFFF', borderRadius: 12, padding: 24, border: '1px solid #E4EAE8' }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <ProgressDots current={step} />

        {step === 1 && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 500, color: '#1F2D37', margin: '0 0 4px' }}>Your business</h2>
            <p style={{ fontSize: 16, color: '#4A5B68', margin: '0 0 24px' }}>Basic details about your business.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className={labelClass}>Business name</label>
                <input type="text" value={bizName} onChange={e => setBizName(e.target.value)} autoComplete="organization" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Contact email</label>
                <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} autoComplete="email" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Contact phone</label>
                <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} autoComplete="tel" className={inputClass} />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 500, color: '#1F2D37', margin: '0 0 4px' }}>Your rates</h2>
            <p style={{ fontSize: 16, color: '#4A5B68', margin: '0 0 24px' }}>These are your defaults. You can change them anytime in settings.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className={labelClass}>Hourly labour rate</label>
                <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid #E4EAE8', borderRadius: 8, overflow: 'hidden', minHeight: 48 }}>
                  <span style={{ padding: '0 12px', display: 'flex', alignItems: 'center', fontSize: 18, color: '#4A5B68', background: '#F6F8F7', borderRight: '1px solid #E4EAE8', flexShrink: 0 }}>$</span>
                  <input type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} min="0" style={{ flex: 1, padding: '0 12px', fontSize: 18, color: '#1F2D37', background: '#FFFFFF', border: 'none', outline: 'none', minWidth: 0 }} />
                  <span style={{ padding: '0 12px', display: 'flex', alignItems: 'center', fontSize: 18, color: '#4A5B68', background: '#F6F8F7', borderLeft: '1px solid #E4EAE8', flexShrink: 0 }}>/hr</span>
                </div>
              </div>
              <div>
                <label className={labelClass}>Default parts markup</label>
                <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid #E4EAE8', borderRadius: 8, overflow: 'hidden', minHeight: 48 }}>
                  <input type="number" value={markupPct} onChange={e => setMarkupPct(e.target.value)} min="0" max="200" style={{ flex: 1, padding: '0 12px', fontSize: 18, color: '#1F2D37', background: '#FFFFFF', border: 'none', outline: 'none', minWidth: 0 }} />
                  <span style={{ padding: '0 12px', display: 'flex', alignItems: 'center', fontSize: 18, color: '#4A5B68', background: '#F6F8F7', borderLeft: '1px solid #E4EAE8', flexShrink: 0 }}>%</span>
                </div>
              </div>
              <div>
                <label className={labelClass}>GST rate</label>
                <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid #E4EAE8', borderRadius: 8, overflow: 'hidden', minHeight: 48 }}>
                  <input type="number" value={gstRate} onChange={e => setGstRate(e.target.value)} min="0" max="100" style={{ flex: 1, padding: '0 12px', fontSize: 18, color: '#1F2D37', background: '#FFFFFF', border: 'none', outline: 'none', minWidth: 0 }} />
                  <span style={{ padding: '0 12px', display: 'flex', alignItems: 'center', fontSize: 18, color: '#4A5B68', background: '#F6F8F7', borderLeft: '1px solid #E4EAE8', flexShrink: 0 }}>%</span>
                </div>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 500, color: '#1F2D37', margin: '0 0 4px' }}>Your base</h2>
            <p style={{ fontSize: 16, color: '#4A5B68', margin: '0 0 24px' }}>This is where callout distances are calculated from.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className={labelClass}>Home base address</label>
                <input
                  type="text"
                  value={homeAddress}
                  onChange={e => { setHomeAddress(e.target.value); setHomeLat(null); setHomeLng(null) }}
                  onBlur={() => geocode(homeAddress)}
                  placeholder="Street, suburb, city"
                  autoComplete="street-address"
                  className={inputClass}
                />
              </div>
              {geoLoading && <p style={{ fontSize: 14, color: '#8CA3A0' }}>Looking up address...</p>}
              {homeLat && !geoLoading && (
                <div style={{ background: '#E6F7F0', border: '1px solid #C5E8D5', borderRadius: 8, padding: '8px 12px' }}>
                  <p style={{ fontSize: 14, color: '#22A67A', margin: 0 }}>Address confirmed</p>
                </div>
              )}
              {geoError && <p style={{ fontSize: 14, color: '#D94444' }}>{geoError}</p>}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 500, color: '#1F2D37', margin: '0 0 4px' }}>Callout zones</h2>
            <p style={{ fontSize: 16, color: '#4A5B68', margin: '0 0 24px' }}>You can change these anytime in settings.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {zones.map((zone, i) => (
                <div key={zone.id} style={{ background: '#F6F8F7', border: '1px solid #E4EAE8', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input type="text" value={zone.name} onChange={e => updateZone(i, 'name', e.target.value)} placeholder="Zone name" style={{ flex: 1, border: '1px solid #E4EAE8', borderRadius: 8, minHeight: 44, padding: '0 12px', fontSize: 16, color: '#1F2D37', background: '#FFFFFF', outline: 'none' }} />
                    {zones.length > 1 && (
                      <button type="button" onClick={() => removeZone(i)} style={{ minWidth: 44, minHeight: 44, border: '1px solid #E4EAE8', borderRadius: 8, background: '#FFFFFF', color: '#D94444', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>x</button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, color: '#8CA3A0', margin: '0 0 4px' }}>From (km)</p>
                      <input type="number" value={zone.min_km} onChange={e => updateZone(i, 'min_km', Number(e.target.value))} style={{ width: '100%', border: '1px solid #E4EAE8', borderRadius: 8, minHeight: 44, padding: '0 12px', fontSize: 16, color: '#1F2D37', background: '#FFFFFF', outline: 'none' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, color: '#8CA3A0', margin: '0 0 4px' }}>To (km)</p>
                      <input type="number" value={zone.max_km ?? ''} onChange={e => updateZone(i, 'max_km', e.target.value === '' ? null : Number(e.target.value))} placeholder="No limit" style={{ width: '100%', border: '1px solid #E4EAE8', borderRadius: 8, minHeight: 44, padding: '0 12px', fontSize: 16, color: '#1F2D37', background: '#FFFFFF', outline: 'none' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, color: '#8CA3A0', margin: '0 0 4px' }}>Fee ($)</p>
                      <input type="number" value={zone.fee} onChange={e => updateZone(i, 'fee', Number(e.target.value))} style={{ width: '100%', border: '1px solid #E4EAE8', borderRadius: 8, minHeight: 44, padding: '0 12px', fontSize: 16, color: '#1F2D37', background: '#FFFFFF', outline: 'none' }} />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addZone} style={{ minHeight: 44, border: '1.5px dashed #E4EAE8', borderRadius: 10, background: 'transparent', color: '#8CA3A0', fontSize: 16, cursor: 'pointer' }}>
                Add zone
              </button>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 500, color: '#1F2D37', margin: '0 0 4px' }}>Your supplier</h2>
            <p style={{ fontSize: 16, color: '#4A5B68', margin: '0 0 24px' }}>Where you order parts from. Used on purchase orders.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className={labelClass}>Supplier name</label>
                <input type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Supplier email</label>
                <input type="email" value={supplierEmail} onChange={e => setSupplierEmail(e.target.value)} placeholder="orders@supplier.co.nz" className={inputClass} />
              </div>
            </div>
          </>
        )}

        {step === 6 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#E6F7F0', border: '2px solid #C5E8D5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24, color: '#22A67A', fontWeight: 700 }}>
                ✓
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 500, color: '#1F2D37', margin: '0 0 8px' }}>You're all set</h2>
              <p style={{ fontSize: 16, color: '#4A5B68', margin: 0 }}>Here's what to do next:</p>
            </div>
            <div style={{ background: '#F6F8F7', border: '1px solid #E4EAE8', borderRadius: 10, padding: 16, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'Add parts to your catalogue',
                'Create your first job',
                'Send your first quote',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#22A67A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#FFFFFF', fontSize: 11, fontWeight: 600 }}>{i + 1}</span>
                  </div>
                  <span style={{ fontSize: 16, color: '#1F2D37' }}>{item}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
          {step > 1 && step < 6 && (
            <button type="button" onClick={() => setStep(s => s - 1)} style={{ flex: 1, minHeight: 48, border: '1px solid #E4EAE8', borderRadius: 10, background: '#FFFFFF', color: '#4A5B68', fontSize: 17, fontWeight: 500, cursor: 'pointer' }}>
              Back
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => saveStep(step)}
            style={{ flex: step === 1 || step === 6 ? 1 : 2, minHeight: 48, borderRadius: 10, border: 'none', background: '#22A67A', color: '#FFFFFF', fontSize: 17, fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Saving...' : step === 6 ? 'Start using Jotey' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
