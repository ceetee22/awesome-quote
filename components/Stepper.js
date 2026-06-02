'use client'

// Big +/- buttons (48px tap targets) for quantities and hours
// No raw number input -- explicit buttons only
export default function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  label,
}) {
  function decrement() {
    const next = Math.max(min, value - step)
    onChange(next)
  }

  function increment() {
    const next = Math.min(max, value + step)
    onChange(next)
  }

  return (
    <div className="flex items-center gap-aq-md">
      {label && (
        <span className="text-body text-aq-ink flex-1">{label}</span>
      )}
      <div className="flex items-center gap-aq-sm">
        <button
          type="button"
          onClick={decrement}
          disabled={value <= min}
          aria-label="Decrease"
          className="min-h-tap w-12 flex items-center justify-center rounded-aq-lg border border-aq-border bg-white text-aq-ink text-section font-medium hover:bg-aq-surface active:bg-aq-border disabled:opacity-40 transition-colors duration-150"
        >
          -
        </button>
        <span className="min-w-[3ch] text-center text-body font-medium text-aq-ink">
          {value}
        </span>
        <button
          type="button"
          onClick={increment}
          disabled={value >= max}
          aria-label="Increase"
          className="min-h-tap w-12 flex items-center justify-center rounded-aq-lg border border-aq-border bg-white text-aq-ink text-section font-medium hover:bg-aq-surface active:bg-aq-border disabled:opacity-40 transition-colors duration-150"
        >
          +
        </button>
      </div>
    </div>
  )
}
