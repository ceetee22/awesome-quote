'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { useSettings } from '@/lib/settings-context'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { compressImage } from '@/lib/compress-image'
import Button from '@/components/Button'
import BackButton from '@/components/BackButton'

const inputClass =
  'w-full bg-white border border-aq-border rounded-aq-md min-h-tap px-4 text-body text-aq-ink placeholder:text-aq-subtle focus:outline-none focus:border-aq-green transition-colors duration-150'

const labelClass = 'block text-secondary text-aq-muted mb-aq-sm'

export default function BusinessPage() {
  const router = useRouter()
  const { settings, updateSettings, settingsLoaded } = useSettings()

  const [form, setForm] = useState({
    business_name: '',
    trading_name: '',
    legal_company_name: '',
    business_tagline: '',
    contact_person_name: '',
    business_phone: '',
    business_email: '',
    home_base_address: '',
  })
  const [homeLat, setHomeLat] = useState(null)
  const [homeLng, setHomeLng] = useState(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // null | 'saving' | 'saved' | 'geocoding' | 'geocode_failed'

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
    })
    setHomeLat(settings.home_base_lat ?? null)
    setHomeLng(settings.home_base_lng ?? null)
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

  async function handleSave() {
    setSaveStatus('saving')

    let lat = homeLat
    let lng = homeLng

    const addressChanged = form.home_base_address !== (settings.home_base_address || '')
    const coordsMissing = lat == null || lng == null

    let geocodeFailed = false
    if (form.home_base_address && (addressChanged || coordsMissing)) {
      setSaveStatus('geocoding')
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(form.home_base_address)}`)
        const data = await res.json()
        if (Array.isArray(data) && data[0]) {
          lat = parseFloat(data[0].lat)
          lng = parseFloat(data[0].lon)
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
      home_base_lat: lat,
      home_base_lng: lng,
    })

    setSaveStatus(geocodeFailed ? 'geocode_failed' : 'saved')
    setTimeout(() => setSaveStatus(null), 2500)
  }

  const isBusy = saveStatus === 'saving' || saveStatus === 'geocoding'

  return (
    <div className="min-h-dvh bg-aq-surface">
      <div className="max-w-[480px] mx-auto px-aq-lg pb-[88px]">

        <div className="flex items-center gap-aq-sm py-aq-xl">
          <BackButton href="/settings" label="Settings" />
          <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm">Business details</h1>
        </div>

        <div className="flex flex-col gap-aq-lg">

          <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
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
                <label htmlFor="home-base" className={labelClass}>Home base address</label>
                <input
                  id="home-base"
                  type="text"
                  value={form.home_base_address}
                  onChange={(e) => setField('home_base_address', e.target.value)}
                  placeholder="e.g. 12 Main St, Papakura"
                  className={inputClass}
                />
                <p className="text-caption text-aq-muted mt-aq-xs">
                  Used to calculate travel distance and time.
                </p>
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

          <Button variant="primary" fullWidth onClick={handleSave} disabled={isBusy}>
            {saveStatus === 'geocoding' ? 'Locating address...' : saveStatus === 'saving' ? 'Saving...' : 'Save'}
          </Button>
          {saveStatus === 'saved' && (
            <p className="text-secondary font-medium text-aq-green text-center">Saved</p>
          )}
          {saveStatus === 'geocode_failed' && (
            <p className="text-secondary text-amber-600 text-center">
              Address not found. Check the home base address and try again.
            </p>
          )}

        </div>
      </div>
    </div>
  )
}
