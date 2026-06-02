'use client'

import { createContext, useContext, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { DEFAULT_SETTINGS, JOB_SOURCE } from './constants'

const JobContext = createContext(null)

export function JobProvider({ children }) {
  const [jobs, setJobs] = useState([])
  const [currentJobId, setCurrentJobId] = useState(null)

  // Derived — avoids keeping two separate copies in sync
  const currentJob = jobs.find((j) => j.id === currentJobId) || null

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
    setJobs((prev) => [...prev, job])
    setCurrentJobId(job.id)
    return job
  }

  // Accepts an updater fn or a replacement value — mirrors useState API
  function setCurrentJob(updater) {
    if (!currentJobId) return
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== currentJobId) return j
        return typeof updater === 'function' ? updater(j) : updater
      })
    )
  }

  // Select an existing job as the current job (used when navigating to a job detail)
  function selectJob(id) {
    if (jobs.find((j) => j.id === id)) {
      setCurrentJobId(id)
    }
  }

  function addItem(item) {
    if (!currentJobId) return
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== currentJobId) return j
        return { ...j, items: [...j.items, { ...item, id: uuidv4() }] }
      })
    )
  }

  function removeItem(itemId) {
    if (!currentJobId) return
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== currentJobId) return j
        return { ...j, items: j.items.filter((i) => i.id !== itemId) }
      })
    )
  }

  function updateItem(itemId, updates) {
    if (!currentJobId) return
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== currentJobId) return j
        return {
          ...j,
          items: j.items.map((i) => (i.id === itemId ? { ...i, ...updates } : i)),
        }
      })
    )
  }

  return (
    <JobContext.Provider
      value={{
        jobs,
        currentJob,
        setCurrentJob,
        createJob,
        selectJob,
        addItem,
        removeItem,
        updateItem,
      }}
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
