'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useJob } from '@/lib/job-context'
import { formatCurrency } from '@/lib/pricing'
import Button from '@/components/Button'
import BackButton from '@/components/BackButton'
import StatusBadge from '@/components/StatusBadge'
import ConfirmModal from '@/components/ConfirmModal'

function ItemCard({ item, onDelete }) {
  const partsTotal = (item.parts || []).reduce(
    (sum, p) => sum + p.sell_price * p.qty,
    0
  )

  return (
    <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
      {/* Heading row */}
      <div className="flex items-start justify-between gap-aq-sm mb-aq-sm">
        <div className="flex-1 min-w-0">
          {item.type === 'diagnosed' ? (
            <>
              <p className="text-body font-medium text-aq-ink">
                {item.joinery_type_label}
              </p>
              <p className="text-secondary text-aq-muted">{item.fault_label}</p>
            </>
          ) : (
            <div className="flex items-center gap-aq-sm flex-wrap">
              <p className="text-body font-medium text-aq-ink">
                {item.description || 'Custom item'}
              </p>
              <StatusBadge status="custom" />
            </div>
          )}
        </div>
        <p className="text-body font-medium text-aq-ink shrink-0">
          {formatCurrency(partsTotal)}
        </p>
      </div>

      {/* Parts list */}
      {item.parts && item.parts.length > 0 && (
        <div className="mb-aq-md border-t border-aq-border pt-aq-sm">
          {item.parts.map((p, idx) => (
            <div
              key={idx}
              className="flex justify-between items-baseline py-aq-xs text-secondary"
            >
              <span className="text-aq-muted truncate pr-aq-md">
                {p.name}{' '}
                <span className="text-aq-subtle">x{p.qty}</span>
              </span>
              <span className="text-aq-muted shrink-0">
                {formatCurrency(p.sell_price * p.qty)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-aq-sm pt-aq-sm border-t border-aq-border">
        <Button
          variant="secondary"
          className="flex-1"
          disabled
        >
          Edit
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          onClick={onDelete}
        >
          Remove
        </Button>
      </div>
    </div>
  )
}

export default function JobItemsPage() {
  const params = useParams()
  const router = useRouter()
  const { currentJob, removeItem } = useJob()

  const [deleteTargetId, setDeleteTargetId] = useState(null)

  const items = currentJob?.items ?? []

  // Running total: parts only (labour and callout set in quote builder)
  const partsTotal = items.reduce((sum, item) => {
    return (
      sum +
      (item.parts || []).reduce((s, p) => s + p.sell_price * p.qty, 0)
    )
  }, 0)

  function handleDeleteConfirm() {
    if (deleteTargetId) {
      removeItem(deleteTargetId)
      setDeleteTargetId(null)
    }
  }

  return (
    <div className="min-h-dvh bg-aq-surface">
      <div className="max-w-[480px] mx-auto px-aq-lg pb-[88px]">

        {/* Header */}
        <div className="flex items-center gap-aq-sm py-aq-xl">
          <BackButton href="/" label="Home" />
          <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm">Job items</h1>
        </div>

        {/* Customer details summary */}
        {currentJob && (
          <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg mb-aq-lg">
            <p className="text-body font-medium text-aq-ink">
              {currentJob.customer_name}
            </p>
            {currentJob.customer_address && (
              <p className="text-secondary text-aq-muted">
                {currentJob.customer_address}
              </p>
            )}
          </div>
        )}

        {/* Empty state */}
        {items.length === 0 ? (
          <div className="bg-white border border-aq-border rounded-aq-xl p-aq-xl text-center mb-aq-lg">
            <p className="text-body text-aq-muted mb-aq-lg">
              No items added yet. Tap below to start.
            </p>
            <Button
              variant="primary"
              fullWidth
              onClick={() => router.push(`/jobs/${params.id}/items/add`)}
            >
              Add first item
            </Button>
          </div>
        ) : (
          <>
            {/* Items list */}
            <div className="flex flex-col gap-[10px] mb-aq-lg">
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onDelete={() => setDeleteTargetId(item.id)}
                />
              ))}
            </div>

            {/* Running total */}
            <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg mb-aq-lg">
              <div className="flex justify-between items-baseline">
                <span className="text-secondary text-aq-muted">Parts total</span>
                <span className="text-body font-medium text-aq-ink">
                  {formatCurrency(partsTotal)}
                </span>
              </div>
              <p className="text-caption text-aq-subtle mt-aq-xs">
                Labour and callout fee added in quote builder
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-aq-sm">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => router.push(`/jobs/${params.id}/items/add`)}
              >
                Add another item
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={() => router.push(`/jobs/${params.id}/quote`)}
              >
                Build quote
              </Button>
            </div>
          </>
        )}

      </div>

      {/* Delete confirm modal */}
      <ConfirmModal
        open={deleteTargetId !== null}
        question="Remove this item?"
        detail="This cannot be undone."
        confirmLabel="Yes, remove"
        cancelLabel="Keep"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />

    </div>
  )
}
