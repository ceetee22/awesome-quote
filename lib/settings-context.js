'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { DEFAULT_CALLOUT_ZONES } from './constants'
import { getSettings, saveSettings } from './db'

const DEFAULT_WINDOW_SIZE_BANDS = [
  { name: 'Small', perimeter_m: 3.0, labour_min: 15 },
  { name: 'Medium', perimeter_m: 4.4, labour_min: 20 },
  { name: 'Large', perimeter_m: 5.4, labour_min: 30 },
  { name: 'Extra large', perimeter_m: 7.0, labour_min: 40 },
]

const DEFAULT_STATE = {
  home_base_address: '',
  hourly_labour_rate: 85,
  default_markup_pct: 50,
  gst_rate: 15,
  business_name: 'Awesome Building Services',
  trading_name: '',
  legal_company_name: '',
  business_tagline: '',
  contact_person_name: '',
  business_phone: '',
  business_email: '',
  logo_url: '',
  supplier_name: 'Joinery Hardware NZ',
  supplier_email: '',
  callout_zones: DEFAULT_CALLOUT_ZONES,
  gst_number: '',
  bank_account_name: '',
  bank_name: '',
  bank_account_number: '',
  payment_terms: 'Payment due on completion of work.',
  terms_and_conditions: '',
  rubber_waste_pct: 10,
  window_size_bands: DEFAULT_WINDOW_SIZE_BANDS,
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_STATE)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  // Load settings from DB on mount
  useEffect(() => {
    getSettings().then((data) => {
      if (data) setSettings(data)
      setSettingsLoaded(true)
    })
  }, [])

  function updateSettings(updates) {
    const next = { ...settings, ...updates }
    setSettings(next)
    saveSettings(next)
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, settingsLoaded }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider')
  return ctx
}
