import Link from 'next/link'

export default function NewJobPage() {
  return (
    <div className="min-h-dvh bg-aq-surface">
      <div className="max-w-[480px] mx-auto px-aq-lg py-aq-xl">
        <Link href="/" className="text-aq-green text-secondary font-medium mb-aq-xl inline-block">
          Back
        </Link>
        <h1 className="text-page-title font-medium text-aq-ink mb-aq-2xl">New job</h1>
        <p className="text-secondary text-aq-muted">Customer details form coming in v0.4.0.</p>
      </div>
    </div>
  )
}
