import Link from 'next/link'

function ChevronLeft() {
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
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

// Back button with chevron + destination label.
// Pass href for link-style, onClick for button-style.
export default function BackButton({ href, label = 'Back', onClick }) {
  const className =
    'min-h-tap flex items-center gap-1 text-secondary font-medium text-aq-ink hover:text-aq-green transition-colors duration-150 -ml-1'

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className} aria-label={`Back to ${label}`}>
        <ChevronLeft />
        <span>{label}</span>
      </button>
    )
  }

  return (
    <Link href={href} className={className} aria-label={`Back to ${label}`}>
      <ChevronLeft />
      <span>{label}</span>
    </Link>
  )
}
