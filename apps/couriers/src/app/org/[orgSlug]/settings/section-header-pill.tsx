import type { ComponentType, SVGProps } from 'react'

export type SectionHeaderTone = 'blue' | 'cyan' | 'sky' | 'teal'

type SectionHeaderPillProps = {
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  title: string
  tone: SectionHeaderTone
}

const TONE_STYLES: Record<
  SectionHeaderTone,
  { pill: string; icon: string }
> = {
  blue: {
    pill: 'bg-blue-100 dark:bg-blue-400/15',
    icon: 'text-blue-600 dark:text-blue-300',
  },
  cyan: {
    pill: 'bg-cyan-100 dark:bg-cyan-400/15',
    icon: 'text-cyan-600 dark:text-cyan-300',
  },
  sky: {
    pill: 'bg-sky-100 dark:bg-sky-400/15',
    icon: 'text-sky-600 dark:text-sky-300',
  },
  teal: {
    pill: 'bg-teal-100 dark:bg-teal-400/15',
    icon: 'text-teal-600 dark:text-teal-300',
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
      className={`mb-4 flex w-fit flex-row items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 ${styles.pill}`}
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
