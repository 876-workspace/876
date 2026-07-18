import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Calendar, Flag, ShieldCheck } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { formatDate } from '@/lib/format'
import { resolveFeature } from '../../../../../features/[id]/_data'
import { resolveApp } from '../../../_data'

type Props = {
  params: Promise<{ slug: string; featureId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, featureId } = await params
  const [app, feature] = await Promise.all([
    resolveApp(slug),
    resolveFeature(featureId),
  ])
  if (!app || !feature || feature.app_id !== app.id)
    return { title: 'Feature audit' }

  return { title: `${feature.name} • Audit - ${app.name} Features` }
}

export default async function AppFeatureAuditPage({ params }: Props) {
  const { slug, featureId } = await params
  const [app, feature] = await Promise.all([
    resolveApp(slug),
    resolveFeature(featureId),
  ])
  if (!app || !feature || feature.app_id !== app.id) notFound()

  const rows = [
    {
      label: 'Console record created',
      value: formatDate(feature.created_at),
      detail: 'Local mirror record was created.',
      icon: ShieldCheck,
    },
    {
      label: 'Console record updated',
      value: formatDate(feature.updated_at),
      detail: 'Local mirror record was last changed.',
      icon: ShieldCheck,
    },
    {
      label: 'Mirror synced',
      value: formatDate(feature.synced_at),
      detail: 'Provider data was last synchronized into Console.',
      icon: Calendar,
    },
  ]

  return (
    <section className="border-876-surface-border border-y py-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">Audit log</h3>
        <p className="text-muted-foreground mt-1 text-xs">
          Provider and Console timestamps for this feature flag.
        </p>
      </div>

      <div className="border-876-surface-border overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[300px]">Action</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const Icon = row.icon
              return (
                <TableRow key={row.label}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Icon className="text-muted-foreground size-4 shrink-0" />
                      <span className="font-medium">{row.label}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {row.detail}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right font-mono text-xs">
                    {row.value}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
