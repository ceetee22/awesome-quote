'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSettings } from '@/lib/settings-context'
import Button from '@/components/Button'
import BackButton from '@/components/BackButton'

const NAV_OPTIONS = [
  { id: 'google_maps', label: 'Google Maps', description: 'Default for most Android and desktop' },
  { id: 'apple_maps', label: 'Apple Maps', description: 'Default for iPhone and iPad' },
  { id: 'waze', label: 'Waze', description: 'Turn-by-turn with real-time traffic' },
  { id: 'system_default', label: 'System default', description: 'Let your phone choose the app' },
]

export default function NavigationPage() {
  const router = useRouter()
  const { settings, updateSettings, settingsLoaded } = useSettings()
  const [selected, setSelected] = useState('google_maps')
  const [saveStatus, setSaveStatus] = useState(null)

  useEffect(() => {
    if (!settingsLoaded) return
    setSelected(settings.preferred_nav_app || 'google_maps')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded])

  async function handleSave() {
    setSaveStatus('saving')
    updateSettings({ nav_app: selected })
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus(null), 2500)
  }

  return (
    <div className="min-h-dvh bg-aq-surface">
      <div className="max-w-[480px] mx-auto px-aq-lg pb-[88px]">

        <div className="flex items-center gap-aq-sm py-aq-xl">
          <BackButton href="/settings" label="Settings" />
          <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm">Navigation app</h1>
        </div>

        <p className="text-secondary text-aq-muted mb-aq-lg">
          Choose which app opens when you tap an address.
        </p>

        <div className="flex flex-col gap-aq-lg">

          <div className="flex flex-col gap-[10px]">
            {NAV_OPTIONS.map((option) => {
              const isSelected = selected === option.id
              return (
                <button
                  key={option.id}
                  onClick={() => setSelected(option.id)}
                  className="w-full text-left"
                >
                  <div
                    style={{ borderRadius: '12px', minHeight: '60px', padding: '14px 16px', borderWidth: '2px', borderStyle: 'solid', display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: isSelected ? '#E6F7F0' : '#ffffff', borderColor: isSelected ? '#22A67A' : '#E4EAE8', transition: 'border-color 150ms, background-color 150ms' }}
                  >
                    <div
                      style={{ width: '30px', height: '30px', borderRadius: '50%', border: '2px solid', borderColor: isSelected ? '#22A67A' : '#D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      {isSelected && (
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#22A67A' }} />
                      )}
                    </div>
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: 500, color: '#1F2D37', lineHeight: 1.3 }}>{option.label}</p>
                      <p style={{ fontSize: '14px', color: '#4A5B68', marginTop: '2px' }}>{option.description}</p>
                    </div>
                  </div>
                </button>
              )
            })}
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
