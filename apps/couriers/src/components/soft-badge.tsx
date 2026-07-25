import type { ReactNode } from 'react'

/**
 * Soft border/background badge tones used across Couriers tables and status UI.
 * Prefer this over `@876/ui/badge` solid variants for status and role chips.
 */
export type SoftBadgeTone =
  | 'sky'
  | 'emerald'
  | 'amber'
  | 'slate'
  | 'purple'
  | 'rose'

const TONE_CLASS: Record<SoftBadgeTone, string> = {
  sky: 'border-sky-400/40 bg-sky-400/10 text-sky-700 dark:text-sky-400',
  emerald:
    'border-emerald-400/40 bg-emerald-400/10 text-emerald-700 dark:text-emerald-400',
  amber:
    'border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-400',
  slate:
    'border-slate-400/40 bg-slate-200/60 text-slate-700 dark:border-slate-500/40 dark:bg-slate-700/40 dark:text-slate-300',
  purple:
    'border-purple-400/40 bg-purple-400/10 text-purple-700 dark:text-purple-400',
  rose: 'border-rose-400/40 bg-rose-400/10 text-rose-700 dark:text-rose-400',
}

type Props = {
  tone: SoftBadgeTone
  children: ReactNode
  className?: string
}

export function SoftBadge({ tone, children, className }: Props) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        TONE_CLASS[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  )
}
