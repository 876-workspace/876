import type { ReactNode } from 'react'

export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string
  value: ReactNode
  detail: string
}) {
  return (
    <section className="876-card flex min-h-32 flex-col justify-between p-5">
      <p className="text-muted-foreground text-xs font-medium tracking-[0.04em] uppercase">
        {label}
      </p>
      <p className="text-foreground mt-3 text-2xl font-semibold tracking-[-0.02em]">
        {value}
      </p>
      <p className="text-muted-foreground mt-1 text-xs">{detail}</p>
    </section>
  )
}
