import type { ComponentType, SVGProps } from 'react'

export function BankingSummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  value: string
}) {
  return (
    <div className="876-card flex items-center gap-3 p-4">
      <span className="876-icon-tile">
        <Icon className="text-876-blue size-4" />
      </span>
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    </div>
  )
}
