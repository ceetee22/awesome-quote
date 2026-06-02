'use client'

// Centred overlay modal for financial/irreversible actions
// No close X -- forces deliberate choice
// Buttons: "Not yet" (secondary) / confirm label (primary)
export default function ConfirmModal({
  open,
  question,
  detail,
  confirmLabel = 'Yes, send',
  cancelLabel = 'Not yet',
  onConfirm,
  onCancel,
  variant = 'primary',
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-aq-xl"
      style={{ backgroundColor: 'rgba(31, 45, 55, 0.5)' }}
      role="dialog"
      aria-modal="true"
      aria-label={question}
    >
      <div className="bg-white rounded-aq-xl p-aq-xl w-full max-w-sm shadow-lg">
        <p className="text-body font-medium text-aq-ink mb-2">{question}</p>
        {detail && (
          <p className="text-secondary text-aq-muted mb-aq-xl">{detail}</p>
        )}
        <div className="flex flex-col gap-aq-sm">
          <button
            type="button"
            onClick={onConfirm}
            className={`w-full min-h-tap text-btn font-medium rounded-aq-lg transition-colors duration-150 ${
              variant === 'destructive'
                ? 'bg-white text-aq-error border border-aq-error-tint-border hover:bg-aq-error-tint'
                : 'bg-aq-green text-white hover:bg-aq-green-hover active:bg-aq-green-pressed'
            }`}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full min-h-tap text-btn font-medium rounded-aq-lg bg-white text-aq-ink border border-aq-border hover:bg-aq-surface active:bg-aq-border transition-colors duration-150"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
