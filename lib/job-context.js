'use client'

import { createContext, useContext, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { DEFAULT_SETTINGS, JOB_SOURCE } from './constants'

const JobContext = createContext(null)

export function JobProvider({ children }) {
  const [currentJob, setCurrentJob] = useState(null)

  function createJob(details) {
    const job = {
      id: uuidv4(),
      customer_name: details.customer_name,
      customer_address: details.customer_address || '',
      customer_phone: details.customer_phone || '',
      source: details.source || JOB_SOURCE.DIRECT,
      status: 'draft',
      items: [],
      callout_fee: 50,
      hourly_rate: DEFAULT_SETTINGS.hourly_labour_rate,
      created_at: new Date().toISOString(),
    }
    setCurrentJob(job)
    return job
  }

  function addItem(item) {
    setCurrentJob((prev) => {
      if (!prev) return prev
      return { ...prev, items: [...prev.items, { ...item, id: uuidv4() }] }
    })
  }

  function removeItem(itemId) {
    setCurrentJob((prev) => {
      if (!prev) return prev
      return { ...prev, items: prev.items.filter((i) => i.id !== itemId) }
    })
  }

  function updateItem(itemId, updates) {
    setCurrentJob((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        items: prev.items.map((i) =>
          i.id === itemId ? { ...i, ...updates } : i
        ),
      }
    })
  }

  return (
    <JobContext.Provider
      value={{ currentJob, setCurrentJob, createJob, addItem, removeItem, updateItem }}
    >
      {children}
    </JobContext.Provider>
  )
}

export function useJob() {
  const ctx = useContext(JobContext)
  if (!ctx) throw new Error('useJob must be used inside JobProvider')
  return ctx
}
