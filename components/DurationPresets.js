'use client'

import { DURATION_PRESETS } from '@/lib/constants'

// Tappable pill buttons for duration selection
// 30m, 1hr, 1.5hr, 2hr+
export default function DurationPresets({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-aq-sm">
      {DURATION_PRESETS.map((preset) => {
        const selected = value === preset.value
        return (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChange(preset.value)}
            className={`min-h-tap px-aq-lg text-btn font-medium rounded-aq-lg border transition-colors duration-150 ${
              selected
                ? 'bg-aq-green text-white border-aq-green'
                : 'bg-white text-aq-ink border-aq-border hover:bg-aq-surface'
            }`}
          >
            {preset.label}
          </button>
        )
      })}
    </div>
  )
}
