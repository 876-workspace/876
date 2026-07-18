import { forwardRef, useId, type SVGProps } from 'react'

export const NotepadIcon = forwardRef<
  SVGSVGElement,
  SVGProps<SVGSVGElement> & { title?: string; titleId?: string }
>(function NotepadIcon({ title, titleId, ...props }, ref) {
  const gradientId = useId()
  const paperGradientId = `widget-note-paper-${gradientId}`
  const coverGradientId = `widget-note-cover-${gradientId}`

  return (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={title ? undefined : true}
      aria-labelledby={title ? titleId : undefined}
      {...props}
    >
      {title ? <title id={titleId}>{title}</title> : null}
      <defs>
        <linearGradient id={paperGradientId} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#FFFBEB" />
          <stop offset="1" stopColor="#FEF3C7" />
        </linearGradient>
        <linearGradient id={coverGradientId} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#FCD34D" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <rect
        x="3.5"
        y="4.5"
        width="17"
        height="17"
        rx="2.25"
        fill={`url(#${paperGradientId})`}
        stroke="#D97706"
        strokeWidth="0.75"
      />
      <path
        d="M3.5 6.75A2.25 2.25 0 0 1 5.75 4.5h12.5a2.25 2.25 0 0 1 2.25 2.25V8.5h-17Z"
        fill={`url(#${coverGradientId})`}
      />
      {[7.5, 12, 16.5].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="4.5" r="1.35" fill="#B45309" opacity="0.3" />
          <circle
            cx={cx}
            cy="4.35"
            r="1.05"
            fill="#E5E7EB"
            stroke="#9CA3AF"
            strokeWidth="0.35"
          />
          <circle cx={cx - 0.3} cy="4" r="0.25" fill="white" opacity="0.8" />
        </g>
      ))}
      <path
        d="M7 12h10M7 15h10M7 18h6.5"
        stroke="#60A5FA"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
    </svg>
  )
})
