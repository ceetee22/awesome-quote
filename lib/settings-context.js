'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { DEFAULT_CALLOUT_ZONES } from './constants'
import { getSettings, saveSettings } from './db'

const DEFAULT_STATE = {
  home_base_address: '',
  hourly_labour_rate: 85,
  default_markup_pct: 50,
  gst_rate: 15,
  business_name: 'Awesome Building Services',
  business_phone: '',
  business_email: '',
  supplier_name: 'Joinery Hardware NZ',
  supplier_email: '',
  callout_zones: DEFAULT_CALLOUT_ZONES,
  gst_number: '',
  bank_account_name: '',
  bank_name: '',
  bank_account_number: '',
  payment_terms: 'Payment due on completion of work.',
  terms_and_conditions: '',
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_STATE)

  // Load settings from DB on mount
  useEffect(() => {
    getSettings().then((data) => {
      if (data) setSettings(data)
    })
  }, [])

  function updateSettings(updates) {
    const next = { ...settings, ...updates }
    setSettings(next)
    saveSettings(next)
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider')
  return ctx
}
