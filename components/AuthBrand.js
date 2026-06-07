// Branded green bar shown at the top of all auth pages.
// Wordmark is inlined as SVG so the gold dot renders correctly on the green background.
export default function AuthBrand() {
  return (
    <div
      style={{
        background: '#22A67A',
        borderRadius: 14,
        padding: '28px 32px 22px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: 28,
      }}
    >
      {/* Wordmark — inline SVG with white text so it reads on green */}
      <svg
        viewBox="0 0 2895.5 1528.22"
        width={140}
        style={{ display: 'block' }}
        role="img"
        aria-label="Jotey"
      >
        <text
          fill="#ffffff"
          fontFamily="Nunito-Regular, Nunito, Inter, sans-serif"
          fontSize="1296"
          transform="translate(73.802 1104.8308)"
        >
          <tspan x="0" y="0">j</tspan>
          <tspan x="305.85" y="0">ot</tspan>
          <tspan x="1467.08" y="0">e</tspan>
          <tspan x="2148.77" y="0">y</tspan>
        </text>
        {/* Rect behind the dot — match green bar so gold circle shows cleanly */}
        <rect fill="#22A67A" x="73.8" y="122.53" width="309.16" height="234.11" />
        {/* Gold dot */}
        <circle fill="#efb541" cx="228.38" cy="239.59" r="94.72" />
      </svg>

      <p
        style={{
          color: 'rgba(255,255,255,0.85)',
          marginTop: 10,
          fontSize: 13,
          fontWeight: 400,
          letterSpacing: '0.01em',
          textAlign: 'center',
        }}
      >
        Quote faster. Get paid sooner.
      </p>
    </div>
  )
}
