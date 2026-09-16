import { Badge } from '@876/ui/badge'

import { formatDay } from '../finance/format-money'
import type { ProjectTemplate } from './types'

export type TemplateSummaryProps = {
  template: ProjectTemplate
}

function Fact({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={mono ? 'mt-0.5 font-mono text-xs' : 'mt-0.5 text-sm'}>
        {value}
      </dd>
    </div>
  )
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
    </div>
  )
}

export function TemplateSummary({ template }: TemplateSummaryProps) {
  return (
    <section className="876-card overflow-hidden">
      <div className="border-border/60 flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
        <div className="min-w-0">
          <h3 className="font-medium">{template.name}</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            {template.description ?? '—'}
          </p>
        </div>
        <Badge variant="secondary">{`v${template.currentVersion}`}</Badge>
      </div>

      <dl className="border-border/60 grid gap-4 border-b px-5 py-4 sm:grid-cols-4">
        <Fact label="Key" value={template.key} mono />
        <Fact
          label="Source project"
          value={template.sourceProjectId ?? '—'}
          mono
        />
        <Fact label="Created" value={formatDay(template.createdAt)} />
        <Fact label="Updated" value={formatDay(template.updatedAt)} />
      </dl>

      <dl className="grid gap-4 px-5 py-4 sm:grid-cols-4">
        <Count label="Phases" value={template.counts.phases} />
        <Count label="Task lists" value={template.counts.taskLists} />
        <Count label="Work items" value={template.counts.workItems} />
        <Count label="Dependencies" value={template.counts.dependencies} />
      </dl>
    </section>
  )
}
