import type { IconComponent } from '@876/ui/icons'
import type { ReactNode } from 'react'

/**
 * A titled card holding a definition list of fields. Shared by the user and
 * organization overview pages. Uses `.876-surface` for light-mode elevation; an
 * optional icon chip and hairline-divided rows give it visual structure.
 */
export function InfoSection({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon?: IconComponent
  children: ReactNode
}) {
  return (
    <div className="876-card group p-5 transition-all duration-300 hover:border-zinc-300 hover:shadow-md dark:hover:border-zinc-700">
      <h2 className="876-section-title mb-4 flex items-center gap-2.5">
        {Icon && (
          <span className="bg-876-accent-surface text-876-accent-fg flex size-7 shrink-0 items-center justify-center rounded-lg shadow-sm ring-1 ring-black/5 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:scale-110 group-hover:shadow-md dark:ring-white/10">
            <Icon aria-hidden="true" className="size-4" />
          </span>
        )}
        {title}
      </h2>
      <dl className="divide-876-surface-border divide-y">{children}</dl>
    </div>
  )
}

export function Field({
  label,
  value,
  mono,
}: {
  label: string
  value: ReactNode
  mono?: boolean
}) {
  return (
    <div className="group/field flex items-baseline justify-between gap-4 py-2.5 transition-colors duration-200 first:pt-0 last:pb-0">
      <dt className="text-muted-foreground group-hover/field:text-foreground shrink-0 text-[0.8125rem] font-medium transition-colors">
        {label}
      </dt>
      <dd
        className={
          mono
            ? 'group-hover/field:text-foreground min-w-0 truncate text-right font-mono text-[0.8125rem] transition-colors'
            : 'group-hover/field:text-foreground min-w-0 truncate text-right text-sm transition-colors'
        }
      >
        {value}
      </dd>
    </div>
  )
}
