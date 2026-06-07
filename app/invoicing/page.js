'use client'

import { useRouter } from 'next/navigation'
import { useJob } from '@/lib/job-context'
import { useSettings } from '@/lib/settings-context'
import BackButton from '@/components/BackButton'
import { formatCurrency, jobTotalIncGst } from '@/lib/pricing'

function formatDate(isoString) {
  if (!isoString) return ''
  try {
    return new Date(isoString).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}

export default function InvoicingPage() {
  const router = useRouter()
  const { jobs } = useJob()
  const { settings } = useSettings()

  const readyJobs = (jobs || [])
    .filter((j) => j.status === 'completed')
    .sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0))

  return (
    <div className="min-h-dvh bg-aq-surface">
      <div className="max-w-[480px] mx-auto px-aq-lg pb-[88px]">

        <div className="flex items-center gap-aq-sm py-aq-xl">
          <BackButton href="/" label="Home" />
          <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm">Ready to invoice</h1>
        </div>

        {readyJobs.length === 0 ? (
          <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg text-center">
            <p className="text-body text-aq-muted">No completed jobs waiting to invoice.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-aq-sm">
            {readyJobs.map((job) => {
              const total = jobTotalIncGst(job, settings.hourly_labour_rate, settings.gst_rate)
              const doneDate = formatDate(job.completed_at)
              return (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => router.push(`/jobs/${job.id}/invoice`)}
                  className="w-full bg-white border border-aq-border rounded-aq-xl p-aq-lg text-left"
                  style={{ cursor: 'pointer', minHeight: 72 }}
                >
                  <div className="flex justify-between items-start gap-aq-sm">
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-medium text-aq-ink truncate">{job.customer_name}</p>
                      {job.customer_address && (
                        <p className="text-secondary text-aq-muted truncate mt-aq-xs">{job.customer_address}</p>
                      )}
                      {doneDate && (
                        <p className="text-caption text-aq-muted mt-aq-xs">Done {doneDate}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-body font-medium text-aq-green">{formatCurrency(total)}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
