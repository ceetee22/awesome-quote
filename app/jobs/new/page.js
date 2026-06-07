'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useJob } from '@/lib/job-context'

export default function NewJobPage() {
  const router = useRouter()
  const { createJob } = useJob()

  useEffect(() => {
    createJob({
      customer_name: '',
      customer_address: '',
      customer_phone: '',
      customer_email: '',
      source: 'direct',
    }).then((job) => {
      router.replace(`/jobs/${job.id}/items/add`)
    })
  }, [])

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F6F8F7' }}>
      <p style={{ color: '#8CA3A0', fontSize: 15 }}>Starting job...</p>
    </div>
  )
}
