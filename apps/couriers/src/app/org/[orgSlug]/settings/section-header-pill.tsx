import type { ComponentType, SVGProps } from 'react'

type SectionHeaderPillProps = {
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  title: string
}

export function SectionHeaderPill({
  Icon,
  title,
}: SectionHeaderPillProps) {
  return (
    <h2 className="mb-4 flex w-fit flex-row items-center gap-2 rounded-xl bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-slate-900 dark:bg-cyan-400/15 dark:text-slate-100">
      <Icon
        aria-hidden="true"
        className="size-4 shrink-0 text-cyan-500"
        strokeWidth={1.75}
      />
      {title}
    </h2>
  )
}
