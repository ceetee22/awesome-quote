'use client'

// variant: 'primary' | 'secondary' | 'destructive' | 'gold'
// All buttons: 48px min height, 10px radius, 17px/500 text
export default function Button({
  variant = 'primary',
  children,
  onClick,
  disabled = false,
  fullWidth = false,
  type = 'button',
  className = '',
}) {
  const base =
    'inline-flex items-center justify-center min-h-tap px-aq-xl text-btn font-medium rounded-aq-lg transition-colors duration-150 cursor-pointer select-none'

  const variants = {
    primary:
      'bg-aq-green text-white hover:bg-aq-green-hover active:bg-aq-green-pressed disabled:opacity-50',
    secondary:
      'bg-white text-aq-ink border border-aq-border hover:bg-aq-surface active:bg-aq-border disabled:opacity-50',
    destructive:
      'bg-white text-aq-error border border-aq-error-tint-border hover:bg-aq-error-tint active:bg-aq-error-tint disabled:opacity-50',
    gold: 'bg-aq-gold text-aq-ink hover:bg-aq-gold-hover active:bg-aq-gold-hover disabled:opacity-50',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  )
}
