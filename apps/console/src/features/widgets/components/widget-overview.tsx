import type { WidgetMetadata } from '@876/widgets'

import { WidgetStatCards } from '@/features/widgets/components/widget-stat-cards'

const HOST_LABELS = {
  console: 'Console',
  billing: '876 Billing',
  couriers: '876 Couriers',
  enterprise: '876 Enterprise',
  '876': '876',
} as const

export function WidgetOverview({ widget }: { widget: WidgetMetadata }) {
  return (
    <div className="max-w-4xl space-y-6">
      <WidgetStatCards widget={widget} />

      <section>
        <h2 className="mb-3 font-semibold">Definition</h2>
        <div className="876-card overflow-hidden">
          <dl className="divide-876-surface-border divide-y text-sm">
            <DefinitionRow label="Version" value={widget.version} />
            <DefinitionRow
              label="Distribution"
              value={
                widget.distribution === 'shared'
                  ? 'Shared across apps'
                  : 'Limited to its host app'
              }
            />
            <DefinitionRow
              label="Ownership"
              value={`${capitalize(widget.ownership)} owned`}
            />
            <DefinitionRow
              label="Implemented apps"
              value={widget.implementedHosts
                .map((host) => HOST_LABELS[host])
                .join(', ')}
            />
            <DefinitionRow
              label="Content backend"
              value={
                widget.dataOwner === 'widgets'
                  ? 'Widgets Postgres'
                  : 'External domain'
              }
            />
          </dl>
        </div>
      </section>
    </div>
  )
}

function DefinitionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 px-4 py-3.5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
