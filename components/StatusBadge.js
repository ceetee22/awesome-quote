// Solid fills per brand guide status colour table
// 14px/500, 6px 14px padding, 8px radius

const STATUS_STYLES = {
  draft: 'bg-aq-status-draft text-aq-muted',
  awaiting: 'bg-aq-status-awaiting text-white',
  quoted: 'bg-aq-status-awaiting text-white',
  accepted: 'bg-aq-status-accepted text-white',
  scheduled: 'bg-aq-status-scheduled text-white',
  ordered: 'bg-aq-status-ordered text-white',
  completed: 'bg-aq-status-completed text-white',
  invoiced: 'bg-aq-status-invoiced text-white',
  custom: 'bg-aq-status-custom text-aq-ink',
}

const STATUS_LABELS = {
  draft: 'Quote in progress',
  quoted: 'Awaiting response',
  awaiting: 'Awaiting response',
  accepted: 'Accepted',
  scheduled: 'Scheduled',
  ordered: 'Parts ordered',
  completed: 'Completed',
  invoiced: 'Invoiced',
  custom: 'Custom',
}

export default function StatusBadge({ status, label }) {
  const styles = STATUS_STYLES[status] || STATUS_STYLES.draft
  const displayLabel = label || STATUS_LABELS[status] || status

  return (
    <span
      className={`inline-flex items-center gap-1 text-caption font-medium px-[14px] py-[6px] rounded-aq-md whitespace-nowrap ${styles}`}
    >
      {status === 'completed' && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2 6l3 3 5-5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {displayLabel}
    </span>
  )
}
