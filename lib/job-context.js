'use client'

import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { DEFAULT_SETTINGS, JOB_SOURCE } from './constants'
import { getJobs, dbCreateJob, dbUpdateJob, dbAddItem, dbRemoveItem, dbUpdateItem } from './db'
import { supabase } from './supabase'

const JobContext = createContext(null)

export function JobProvider({ children }) {
  const [jobs, setJobs] = useState([])
  const [currentJobId, setCurrentJobId] = useState(null)
  const [pendingSelectId, setPendingSelectId] = useState(null)

  const currentJob = jobs.find((j) => j.id === currentJobId) || null

  // Keep a ref for synchronous reads of the current job (used in setCurrentJob)
  const jobsRef = useRef(jobs)
  useEffect(() => { jobsRef.current = jobs }, [jobs])

  // Load jobs for the current authenticated user.
  // Also subscribes to auth changes so switching users always sees their own data.
  useEffect(() => {
    function loadJobs() {
      getJobs().then((dbJobs) => {
        setJobs(dbJobs) // always replace — never leave a previous user's jobs in state
      })
    }

    loadJobs()

    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setCurrentJobId(null)
        loadJobs()
      } else if (event === 'SIGNED_OUT') {
        setJobs([])
        setCurrentJobId(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Resolve any pending selectJob call that arrived before jobs loaded
  useEffect(() => {
    if (pendingSelectId && jobs.find((j) => j.id === pendingSelectId)) {
      setCurrentJobId(pendingSelectId)
      setPendingSelectId(null)
    }
  }, [jobs, pendingSelectId])

  async function createJob(details) {
    const job = {
      id: uuidv4(),
      customer_name: details.customer_name,
      customer_address: details.customer_address || '',
      customer_phone: details.customer_phone || '',
      customer_email: details.customer_email || '',
      source: details.source || JOB_SOURCE.DIRECT,
      status: 'draft',
      items: [],
      callout_fee: 50,
      hourly_rate: DEFAULT_SETTINGS.hourly_labour_rate,
      created_at: new Date().toISOString(),
    }
    setJobs((prev) => [...prev, job])
    setCurrentJobId(job.id)
    await dbCreateJob(job)
    return job
  }

  function setCurrentJob(updater) {
    if (!currentJobId) return
    // Use a functional updater so we read the latest prev state — this prevents
    // overwriting items that were added by addItem() in the same React batch.
    setJobs((prev) => {
      const current = prev.find((j) => j.id === currentJobId)
      if (!current) return prev
      const updated = typeof updater === 'function' ? updater(current) : { ...current, ...updater }
      return prev.map((j) => (j.id !== currentJobId ? j : updated))
    })
    // DB write uses the ref (may be one render behind) but dbUpdateJob strips items anyway
    const current = jobsRef.current.find((j) => j.id === currentJobId)
    if (current) {
      const dbFields = typeof updater === 'function' ? updater(current) : { ...current, ...updater }
      dbUpdateJob(currentJobId, dbFields)
    }
  }

  function selectJob(id) {
    if (jobs.find((j) => j.id === id)) {
      setCurrentJobId(id)
    } else {
      setPendingSelectId(id)
    }
  }

  function addItem(item) {
    if (!currentJobId) return
    const itemWithId = { ...item, id: item.id || uuidv4() }
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== currentJobId) return j
        return { ...j, items: [...j.items, itemWithId] }
      })
    )
    dbAddItem(currentJobId, itemWithId)
  }

  function removeItem(itemId) {
    if (!currentJobId) return
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== currentJobId) return j
        return { ...j, items: j.items.filter((i) => i.id !== itemId) }
      })
    )
    dbRemoveItem(itemId)
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
    dbUpdateItem(itemId, updates)
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
