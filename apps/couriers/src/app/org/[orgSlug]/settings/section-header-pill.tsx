import type { ComponentType, SVGProps } from 'react'

export type SectionHeaderTone = 'blue' | 'cyan' | 'sky' | 'teal'

type SectionHeaderPillProps = {
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  title: string
  tone: SectionHeaderTone
}

const TONE_STYLES: Record<SectionHeaderTone, { header: string; icon: string }> =
  {
    blue: {
      header:
        'border-violet-100! bg-violet-50! dark:border-violet-300/15! dark:bg-violet-400/10!',
      icon: 'text-violet-500 dark:text-violet-400',
    },
    cyan: {
      header:
        'border-indigo-100! bg-indigo-50! dark:border-indigo-300/15! dark:bg-indigo-400/10!',
      icon: 'text-indigo-500 dark:text-indigo-400',
    },
    sky: {
      header:
        'border-slate-200! bg-slate-50! dark:border-slate-300/15! dark:bg-slate-400/10!',
      icon: 'text-slate-500 dark:text-slate-400',
    },
    teal: {
      header:
        'border-purple-100! bg-purple-50! dark:border-purple-300/15! dark:bg-purple-400/10!',
      icon: 'text-purple-500 dark:text-purple-400',
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
      className={`flex min-h-12 w-full flex-row items-center gap-2 border-b px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-50 ${styles.header}`}
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
