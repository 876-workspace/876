import type { ComponentType, SVGProps } from 'react'

export type SectionHeaderTone =
  | 'violet'
  | 'fuchsia'
  | 'rose'
  | 'amber'
  | 'lime'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'indigo'
  | 'orange'

type SectionHeaderPillProps = {
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  title: string
  tone: SectionHeaderTone
}

const TONE_STYLES: Record<SectionHeaderTone, { header: string; icon: string }> =
  {
    violet: {
      header:
        'border-violet-100! bg-violet-50! dark:border-violet-300/10! dark:bg-violet-400/6!',
      icon: 'text-violet-600 dark:text-violet-300',
    },
    fuchsia: {
      header:
        'border-fuchsia-100! bg-fuchsia-50! dark:border-fuchsia-300/10! dark:bg-fuchsia-400/6!',
      icon: 'text-fuchsia-600 dark:text-fuchsia-300',
    },
    rose: {
      header:
        'border-rose-100! bg-rose-50! dark:border-rose-300/10! dark:bg-rose-400/6!',
      icon: 'text-rose-600 dark:text-rose-300',
    },
    amber: {
      header:
        'border-amber-100! bg-amber-50! dark:border-amber-300/10! dark:bg-amber-400/6!',
      icon: 'text-amber-600 dark:text-amber-300',
    },
    lime: {
      header:
        'border-lime-100! bg-lime-50! dark:border-lime-300/10! dark:bg-lime-400/6!',
      icon: 'text-lime-600 dark:text-lime-300',
    },
    emerald: {
      header:
        'border-emerald-100! bg-emerald-50! dark:border-emerald-300/10! dark:bg-emerald-400/6!',
      icon: 'text-emerald-600 dark:text-emerald-300',
    },
    teal: {
      header:
        'border-teal-100! bg-teal-50! dark:border-teal-300/10! dark:bg-teal-400/6!',
      icon: 'text-teal-600 dark:text-teal-300',
    },
    cyan: {
      header:
        'border-cyan-100! bg-cyan-50! dark:border-cyan-300/10! dark:bg-cyan-400/6!',
      icon: 'text-cyan-600 dark:text-cyan-300',
    },
    indigo: {
      header:
        'border-indigo-100! bg-indigo-50! dark:border-indigo-300/10! dark:bg-indigo-400/6!',
      icon: 'text-indigo-600 dark:text-indigo-300',
    },
    orange: {
      header:
        'border-orange-100! bg-orange-50! dark:border-orange-300/10! dark:bg-orange-400/6!',
      icon: 'text-orange-600 dark:text-orange-300',
    },
  }

export function SectionHeaderPill({
  Icon,
  title,
  tone,
}: SectionHeaderPillProps) {
  const styles = TONE_STYLES[tone]

  return (
    <h2
      className={`flex min-h-12 w-full flex-row items-center gap-2 border-b px-4 py-3 text-[0.8125rem] font-semibold text-slate-900 dark:text-slate-50 ${styles.header}`}
    >
      <Icon
        aria-hidden="true"
        className={`size-4 shrink-0 ${styles.icon}`}
        strokeWidth={1.75}
      />
      {title}
    </h2>
  )
}
