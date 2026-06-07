'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSettings } from '@/lib/settings-context'
import Button from '@/components/Button'
import BackButton from '@/components/BackButton'

const labelClass = 'block text-secondary text-aq-muted mb-aq-sm'

function PrefixInput({ id, prefix, value, onChange, placeholder }) {
  return (
    <div className="flex items-stretch border border-aq-border rounded-aq-md overflow-hidden min-h-tap focus-within:border-aq-green transition-colors duration-150 bg-white">
      <span className="px-3 flex items-center text-body text-aq-muted bg-aq-surface border-r border-aq-border shrink-0">{prefix}</span>
      <input id={id} type="number" value={value} onChange={onChange} placeholder={placeholder} className="flex-1 px-3 text-body text-aq-ink bg-white focus:outline-none min-w-0" />
    </div>
  )
}

function SuffixInput({ id, suffix, value, onChange, placeholder }) {
  return (
    <div className="flex items-stretch border border-aq-border rounded-aq-md overflow-hidden min-h-tap focus-within:border-aq-green transition-colors duration-150 bg-white">
      <input id={id} type="number" value={value} onChange={onChange} placeholder={placeholder} className="flex-1 px-3 text-body text-aq-ink bg-white focus:outline-none min-w-0" />
      <span className="px-3 flex items-center text-body text-aq-muted bg-aq-surface border-l border-aq-border shrink-0">{suffix}</span>
    </div>
  )
}

export default function LabourPage() {
  const router = useRouter()
  const { settings, updateSettings, settingsLoaded } = useSettings()
  const [hourlyRate, setHourlyRate] = useState('')
  const [markupPct, setMarkupPct] = useState('')
  const [gstRate, setGstRate] = useState('')
  const [saveStatus, setSaveStatus] = useState(null)

  useEffect(() => {
    if (!settingsLoaded) return
    setHourlyRate(String(settings.hourly_labour_rate || 85))
    setMarkupPct(String(settings.default_markup_pct || 50))
    setGstRate(String(settings.gst_rate || 15))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded])

  async function handleSave() {
    setSaveStatus('saving')
    updateSettings({
      hourly_labour_rate: parseFloat(hourlyRate) || 85,
      default_markup_pct: parseFloat(markupPct) || 50,
      gst_rate: parseFloat(gstRate) || 15,
    })
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus(null), 2500)
  }

  return (
    <div className="min-h-dvh bg-aq-surface">
      <div className="max-w-[480px] mx-auto px-aq-lg pb-[88px]">

        <div className="flex items-center gap-aq-sm py-aq-xl">
          <BackButton href="/settings" label="Settings" />
          <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm">Labour and markup</h1>
        </div>

        <div className="flex flex-col gap-aq-lg">

          <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
            <p className="text-secondary text-aq-muted">
              These defaults apply to every new quote. You can always override on individual jobs.
            </p>
          </div>

          <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
            <div className="flex flex-col gap-aq-md">
              <div>
                <label htmlFor="hourly-rate" className={labelClass}>Hourly labour rate</label>
                <PrefixInput
                  id="hourly-rate"
                  prefix="$"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="85"
                />
              </div>
              <div>
                <label htmlFor="markup-pct" className={labelClass}>Markup on custom parts</label>
                <SuffixInput
                  id="markup-pct"
                  suffix="%"
                  value={markupPct}
                  onChange={(e) => setMarkupPct(e.target.value)}
                  placeholder="50"
                />
                <p className="text-caption text-aq-muted mt-aq-xs">
                  Applied to the cost you enter when adding a manual part.
                </p>
              </div>
              <div>
                <label htmlFor="gst-rate" className={labelClass}>GST rate</label>
                <SuffixInput
                  id="gst-rate"
                  suffix="%"
                  value={gstRate}
                  onChange={(e) => setGstRate(e.target.value)}
                  placeholder="15"
                />
              </div>
            </div>
          </div>

          <Button variant="primary" fullWidth onClick={handleSave} disabled={saveStatus === 'saving'}>
            {saveStatus === 'saving' ? 'Saving...' : 'Save'}
          </Button>
          {saveStatus === 'saved' && (
            <p className="text-secondary font-medium text-aq-green text-center">Saved</p>
          )}

        </div>
      </div>
    </div>
  )
}
