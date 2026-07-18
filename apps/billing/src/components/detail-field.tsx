import type { ReactNode } from 'react'

export function DetailField({
  label,
  value,
  mono = false,
}: {
  label: string
  value: ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-muted-foreground shrink-0 text-[0.8125rem] font-medium">
        {label}
      </dt>
      <dd
        className={
          mono
            ? 'min-w-0 truncate text-right font-mono text-[0.8125rem]'
            : 'min-w-0 truncate text-right text-sm'
        }
      >
        {value}
      </dd>
    </div>
  )
}
