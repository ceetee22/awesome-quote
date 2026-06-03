'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useJob } from '@/lib/job-context'
import { JOB_SOURCE, JOB_SOURCE_LABELS } from '@/lib/constants'
import Button from '@/components/Button'
import BackButton from '@/components/BackButton'

const SOURCE_OPTIONS = [
  JOB_SOURCE.DIRECT,
  JOB_SOURCE.PROPERTY_MANAGER,
  JOB_SOURCE.BUILDER,
]

const inputClass =
  'w-full bg-white border border-aq-border rounded-aq-md min-h-tap px-4 text-body text-aq-ink placeholder:text-aq-subtle focus:outline-none focus:border-aq-green transition-colors duration-150'

export default function NewJobPage() {
  const router = useRouter()
  const { createJob } = useJob()

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [source, setSource] = useState(JOB_SOURCE.DIRECT)

  async function handleStart() {
    const job = await createJob({
      customer_name: name.trim(),
      customer_address: address.trim(),
      customer_phone: phone.trim(),
      source,
    })
    router.push(`/jobs/${job.id}/items`)
  }

  const canStart = name.trim().length > 0

  return (
    <div className="min-h-dvh bg-aq-surface">
      <div className="max-w-[480px] mx-auto px-aq-lg pb-aq-2xl">

        {/* Header */}
        <div className="flex items-center gap-aq-sm py-aq-xl">
          <BackButton href="/" label="Home" />
          <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm">New job</h1>
        </div>

        {/* Form fields */}
        <div className="flex flex-col gap-aq-lg">

          <div>
            <label
              htmlFor="customer_name"
              className="block text-secondary text-aq-muted mb-aq-sm"
            >
              Customer name
            </label>
            <input
              id="customer_name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Taufa"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="address"
              className="block text-secondary text-aq-muted mb-aq-sm"
            >
              Address
            </label>
            <input
              id="address"
              type="text"
              autoComplete="street-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 14 Rata St, Papakura"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-secondary text-aq-muted mb-aq-sm"
            >
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 021 123 4567"
              className={inputClass}
            />
          </div>

          {/* Job source selector */}
          <div>
            <p className="text-secondary text-aq-muted mb-aq-sm">Job source</p>
            <div className="flex gap-aq-sm">
              {SOURCE_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSource(s)}
                  className={`flex-1 min-h-tap px-aq-md text-secondary font-medium rounded-aq-lg border transition-colors duration-150 ${
                    source === s
                      ? 'border-aq-green text-aq-green bg-aq-green-tint'
                      : 'border-aq-border text-aq-muted bg-white hover:bg-aq-surface'
                  }`}
                >
                  {JOB_SOURCE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* CTA */}
        <div className="mt-aq-2xl">
          <Button
            variant="primary"
            fullWidth
            disabled={!canStart}
            onClick={handleStart}
          >
            Start adding items
          </Button>
        </div>

      </div>
    </div>
  )
}
