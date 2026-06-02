'use client'

import { createContext, useContext, useState } from 'react'
import { DEFAULT_CALLOUT_ZONES } from './constants'

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
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_STATE)

  function updateSettings(updates) {
    setSettings((prev) => ({ ...prev, ...updates }))
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
