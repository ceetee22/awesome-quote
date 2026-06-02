'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { JOINERY_TYPE_LABELS, FAULT_OPTIONS } from '@/lib/constants'
import { getSuggestedParts } from '@/lib/diagnosis'
import { MOCK_PARTS } from '@/lib/mock-data'
import { useJob } from '@/lib/job-context'
import { formatCurrency } from '@/lib/pricing'
import Button from '@/components/Button'
import Stepper from '@/components/Stepper'

// Three steps: 'type' → 'fault' → 'parts'

function BackArrow() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  )
}

// Letter-based photo placeholder — shown when part has no photo_url
function PartPhoto({ name }) {
  return (
    <div className="w-16 h-16 rounded-aq-md bg-aq-green-tint flex items-center justify-center shrink-0">
      <span className="text-section font-medium text-aq-green">
        {name ? name[0].toUpperCase() : '?'}
      </span>
    </div>
  )
}

export default function AddItemPage() {
  const params = useParams()
  const router = useRouter()
  const { addItem } = useJob()

  const [step, setStep] = useState('type')
  const [joineryType, setJoineryType] = useState(null)
  const [faultValue, setFaultValue] = useState(null)
  const [faultLabel, setFaultLabel] = useState('')
  // partState: { [partId]: { part, qty, selected } }
  const [partState, setPartState] = useState({})

  function handleBack() {
    if (step === 'fault') {
      setStep('type')
      setJoineryType(null)
    } else if (step === 'parts') {
      setStep('fault')
      setFaultValue(null)
      setFaultLabel('')
      setPartState({})
    } else {
      router.push(`/jobs/${params.id}/items`)
    }
  }

  function selectJoineryType(type) {
    setJoineryType(type)
    setStep('fault')
  }

  function selectFault(option) {
    setFaultValue(option.value)
    setFaultLabel(option.label)

    // Pre-load suggested parts into partState with default quantities
    const suggestions = getSuggestedParts(MOCK_PARTS, joineryType, option.value)
    const initial = {}
    suggestions.forEach((p) => {
      initial[p.id] = { part: p, qty: p.default_qty, selected: false }
    })
    setPartState(initial)
    setStep('parts')
  }

  function togglePart(partId) {
    setPartState((prev) => ({
      ...prev,
      [partId]: { ...prev[partId], selected: !prev[partId].selected },
    }))
  }

  function setQty(partId, qty) {
    setPartState((prev) => ({
      ...prev,
      [partId]: { ...prev[partId], qty },
    }))
  }

  function handleAddToJob() {
    const chosenParts = Object.values(partState)
      .filter((ps) => ps.selected)
      .map((ps) => ({
        part_id: ps.part.id,
        name: ps.part.name,
        sku: ps.part.sku,
        sell_price: ps.part.sell_price,
        cost_price: ps.part.cost_price,
        qty: ps.qty,
        unit: ps.part.unit,
        supplier: ps.part.supplier,
        supplier_code: ps.part.supplier_code,
      }))

    addItem({
      type: 'diagnosed',
      joinery_type: joineryType,
      joinery_type_label: JOINERY_TYPE_LABELS[joineryType],
      fault: faultValue,
      fault_label: faultLabel,
      parts: chosenParts,
      labour_hours: 0,
      hourly_rate: 95,
    })

    router.push(`/jobs/${params.id}/items`)
  }

  const faultOptions = joineryType ? FAULT_OPTIONS[joineryType] : []
  const suggestions = step === 'parts' ? Object.values(partState).map((ps) => ps.part) : []
  const hasSelected = Object.values(partState).some((ps) => ps.selected)

  // Page title and subtitle based on step
  let pageTitle = 'Add item'
  let pageSubtitle = null
  if (step === 'fault') pageTitle = JOINERY_TYPE_LABELS[joineryType]
  if (step === 'parts') {
    pageTitle = 'Suggested parts'
    pageSubtitle = `${JOINERY_TYPE_LABELS[joineryType]} / ${faultLabel}`
  }

  return (
    <div className="min-h-dvh bg-aq-surface">
      <div className="max-w-[480px] mx-auto px-aq-lg pb-aq-2xl">

        {/* Header */}
        <div className="flex items-center gap-aq-sm py-aq-xl">
          <button
            type="button"
            onClick={handleBack}
            className="min-h-tap min-w-[48px] flex items-center justify-center text-aq-green -ml-3"
            aria-label="Go back"
          >
            <BackArrow />
          </button>
          <div>
            <h1 className="text-page-title font-medium text-aq-ink">{pageTitle}</h1>
            {pageSubtitle && (
              <p className="text-secondary text-aq-muted">{pageSubtitle}</p>
            )}
          </div>
        </div>

        {/* ── Step 1: Joinery type ── */}
        {step === 'type' && (
          <div className="flex flex-col gap-[10px]">
            {Object.entries(JOINERY_TYPE_LABELS).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => selectJoineryType(value)}
                className="w-full min-h-tap px-aq-xl text-body font-medium text-aq-ink bg-white border border-aq-border rounded-aq-xl text-left hover:bg-aq-surface active:bg-aq-border transition-colors duration-150"
              >
                {label}
              </button>
            ))}

            {/* Divider */}
            <div className="flex items-center gap-aq-md my-aq-sm">
              <div className="flex-1 h-px bg-aq-border" />
              <span className="text-caption text-aq-subtle">or</span>
              <div className="flex-1 h-px bg-aq-border" />
            </div>

            <button
              type="button"
              onClick={() => router.push(`/jobs/${params.id}/items/custom`)}
              className="w-full min-h-tap px-aq-xl text-body font-medium text-aq-ink bg-white border border-aq-border rounded-aq-xl text-left hover:bg-aq-surface active:bg-aq-border transition-colors duration-150"
            >
              Custom item
            </button>
          </div>
        )}

        {/* ── Step 2: Fault selection ── */}
        {step === 'fault' && (
          <div className="flex flex-col gap-[10px]">
            <p className="text-secondary text-aq-muted mb-aq-sm">What is wrong with it?</p>
            {faultOptions.map((option, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectFault(option)}
                className="w-full min-h-tap px-aq-xl text-body font-medium text-aq-ink bg-white border border-aq-border rounded-aq-xl text-left hover:bg-aq-surface active:bg-aq-border transition-colors duration-150"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Step 3: Suggested parts ── */}
        {step === 'parts' && (
          <>
            {suggestions.length === 0 ? (
              <div className="bg-white border border-aq-border rounded-aq-xl p-aq-xl text-center">
                <p className="text-body text-aq-muted mb-aq-lg">
                  No parts found for this fault. Browse the catalogue to add parts manually.
                </p>
                <Link
                  href="/catalogue"
                  className="text-aq-green text-secondary font-medium"
                >
                  Browse full catalogue
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-[10px]">
                {suggestions.map((part) => {
                  const ps = partState[part.id]
                  const isSelected = ps?.selected ?? false
                  const qty = ps?.qty ?? part.default_qty

                  return (
                    <div
                      key={part.id}
                      className={`bg-white border rounded-aq-xl p-aq-lg transition-colors duration-150 ${
                        isSelected ? 'border-aq-green' : 'border-aq-border'
                      }`}
                    >
                      {/* Part info row */}
                      <div className="flex items-start gap-aq-md mb-aq-md">
                        <PartPhoto name={part.name} />
                        <div className="flex-1 min-w-0">
                          <p className="text-body font-medium text-aq-ink leading-snug">
                            {part.name}
                          </p>
                          <p className="text-caption text-aq-muted mt-aq-xs">
                            {part.sku} &middot; {part.supplier}
                          </p>
                          <p className="text-body font-medium text-aq-green mt-aq-xs">
                            {formatCurrency(part.sell_price)}{' '}
                            <span className="text-caption text-aq-subtle font-regular">
                              / {part.unit}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Qty stepper + Add toggle */}
                      <div className="flex items-center justify-between gap-aq-md">
                        <Stepper
                          value={qty}
                          onChange={(v) => setQty(part.id, v)}
                          min={1}
                          max={20}
                        />
                        <button
                          type="button"
                          onClick={() => togglePart(part.id)}
                          className={`min-h-tap px-aq-xl text-btn font-medium rounded-aq-lg border transition-colors duration-150 ${
                            isSelected
                              ? 'bg-aq-green text-white border-aq-green'
                              : 'bg-white text-aq-ink border-aq-border hover:bg-aq-surface'
                          }`}
                        >
                          {isSelected ? 'Added' : 'Add'}
                        </button>
                      </div>
                    </div>
                  )
                })}

                {/* Browse full catalogue escape hatch */}
                <Link
                  href="/catalogue"
                  className="block text-center text-aq-green text-secondary font-medium py-aq-md"
                >
                  Browse full catalogue
                </Link>
              </div>
            )}

            {/* Add to job CTA */}
            <div className="mt-aq-lg">
              <Button
                variant="primary"
                fullWidth
                disabled={!hasSelected}
                onClick={handleAddToJob}
              >
                Add to job
              </Button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
