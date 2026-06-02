// White bg, 0.5px border #E4EAE8, 12px radius, 16px padding
export default function Card({ children, className = '', onClick }) {
  const base =
    'bg-white border border-aq-border rounded-aq-xl p-aq-lg'

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${base} w-full text-left cursor-pointer hover:bg-aq-surface transition-colors duration-150 active:bg-aq-border ${className}`}
      >
        {children}
      </button>
    )
  }

  return <div className={`${base} ${className}`}>{children}</div>
}
