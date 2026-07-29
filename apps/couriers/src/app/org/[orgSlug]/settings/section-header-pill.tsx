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
        'border-blue-200! bg-blue-100! dark:border-blue-300/25! dark:bg-blue-400/20!',
      icon: 'text-blue-600 dark:text-blue-300',
    },
    cyan: {
      header:
        'border-cyan-200! bg-cyan-100! dark:border-cyan-300/25! dark:bg-cyan-400/20!',
      icon: 'text-cyan-600 dark:text-cyan-300',
    },
    sky: {
      header:
        'border-sky-200! bg-sky-100! dark:border-sky-300/25! dark:bg-sky-400/20!',
      icon: 'text-sky-600 dark:text-sky-300',
    },
    teal: {
      header:
        'border-teal-200! bg-teal-100! dark:border-teal-300/25! dark:bg-teal-400/20!',
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
