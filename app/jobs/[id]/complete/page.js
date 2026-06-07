'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useJob } from '@/lib/job-context'
import BackButton from '@/components/BackButton'
import Button from '@/components/Button'
import PhotoCapture from '@/components/PhotoCapture'
import ConfirmModal from '@/components/ConfirmModal'

export default function CompletePage() {
  const params = useParams()
  const router = useRouter()
  const { jobs, currentJob, setCurrentJob, selectJob } = useJob()
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    const match = jobs.find((j) => j.id === params.id)
    if (match) selectJob(params.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  if (!currentJob) {
    return (
      <div className="min-h-dvh bg-aq-surface flex items-center justify-center px-aq-lg">
        <p className="text-body text-aq-muted">Loading...</p>
      </div>
    )
  }

  const afterPhotos = (currentJob.after_photos || []).filter((p) => p.type === 'after')

  function handleAfterPhotosChange(newPhotos) {
    const other = (currentJob.after_photos || []).filter((p) => p.type !== 'after')
    setCurrentJob((prev) => ({ ...prev, after_photos: [...other, ...newPhotos] }))
  }

  function handleMarkDone() {
    setCurrentJob((prev) => ({
      ...prev,
      status: 'completed',
      completed_at: prev.completed_at || new Date().toISOString(),
    }))
    router.push(`/jobs/${params.id}/invoice`)
  }

  return (
    <>
      <div className="min-h-dvh bg-aq-surface">
        <div className="max-w-[480px] mx-auto px-aq-lg pb-8">

          <div className="flex items-center gap-aq-sm py-aq-xl">
            <BackButton href={`/jobs/${params.id}`} label="Job" />
            <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm">Mark as done</h1>
          </div>

          <div className="flex flex-col gap-aq-lg">

            <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
              <p className="text-body font-medium text-aq-ink">{currentJob.customer_name}</p>
              {currentJob.customer_address && (
                <p className="text-secondary text-aq-muted mt-aq-xs">{currentJob.customer_address}</p>
              )}
            </div>

            <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
              <PhotoCapture
                photos={afterPhotos}
                onChange={handleAfterPhotosChange}
                label="After photos (optional)"
                buttonLabel="Add after photo"
                uploadOpts={{ jobId: params.id, type: 'after' }}
              />
            </div>

            <Button variant="primary" fullWidth onClick={() => setConfirmOpen(true)}>
              Mark as done
            </Button>

          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        question="Mark this job as complete?"
        confirmLabel="Yes, done"
        cancelLabel="Not yet"
        onConfirm={handleMarkDone}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
