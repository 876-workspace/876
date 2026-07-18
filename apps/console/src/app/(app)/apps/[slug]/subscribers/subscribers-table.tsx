'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import type { AdminSubscription, AdminOrganization } from '@876/admin'
import { cn } from '@876/core/utils'
import { DataTable } from '@876/ui/data-table'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Switch } from '@876/ui/switch'
import { Input } from '@876/ui/input'
import { Building2, SearchIcon } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { toast } from 'sonner'

import { client } from '@/lib/client'
import { formatDate, statusBadgeClass } from '@/lib/format'

type PriceOption = { id: string; label: string }

type Props = {
  data: AdminSubscription[]
  orgMap: Record<string, AdminOrganization>
  prices: PriceOption[]
  appSlug: string
}

function PriceCell({
  record,
  prices,
}: {
  record: AdminSubscription
  prices: PriceOption[]
}) {
  const router = useRouter()
  const currentPriceId = record.items[0]?.price_id ?? ''
  const [priceId, setPriceId] = useState(currentPriceId)
  const [loading, setLoading] = useState(false)

  async function handleChange(value: string) {
    if (!value) return
    const previous = priceId
    setPriceId(value)
    setLoading(true)
    const { error } = await client.orgs.updateSubscription(
      record.organization_id,
      record.app_id,
      { price_id: value }
    )
    setLoading(false)
    if (error) {
      setPriceId(previous)
      toast.error(`Failed to change plan: ${error}`)
      return
    }
    router.refresh()
  }

  return (
    <NativeSelect
      value={priceId}
      onChange={(e) => void handleChange(e.target.value)}
      disabled={loading}
      className="w-44"
      onClick={(e) => e.stopPropagation()}
    >
      {!currentPriceId && (
        <NativeSelectOption value="">No plan</NativeSelectOption>
      )}
      {prices.map((price) => (
        <NativeSelectOption key={price.id} value={price.id}>
          {price.label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
}

function StatusCell({ record }: { record: AdminSubscription }) {
  const router = useRouter()
  const [status, setStatus] = useState(record.status)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    const next = status === 'active' ? 'blocked' : 'active'
    setStatus(next)
    setLoading(true)
    const { error } = await client.orgs.updateSubscription(
      record.organization_id,
      record.app_id,
      { status: next }
    )
    setLoading(false)
    if (error) {
      setStatus(status)
      toast.error(`Failed to update access: ${error}`)
      return
    }
    router.refresh()
  }

  return (
    <div
      className="flex items-center gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      <Switch
        checked={status === 'active'}
        onCheckedChange={() => void toggle()}
        disabled={loading}
        aria-label="Toggle access"
      />
      <span
        className={cn(
          'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
          statusBadgeClass(status)
        )}
      >
        {status}
      </span>
    </div>
  )
}

function buildColumns(
  orgMap: Record<string, AdminOrganization>,
  prices: PriceOption[]
): ColumnDef<AdminSubscription, unknown>[] {
  return [
    {
      id: 'organization',
      header: 'Organization',
      cell: ({ row }) => {
        const org = orgMap[row.original.organization_id]
        if (!org) {
          return (
            <span className="text-muted-foreground font-mono text-xs">
              {row.original.organization_id}
            </span>
          )
        }
        return (
          <Link
            href={`/orgs/${org.slug}`}
            className="hover:text-primary font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {org.name ?? org.slug}
          </Link>
        )
      },
    },
    {
      id: 'plan',
      header: 'Plan',
      cell: ({ row }) => <PriceCell record={row.original} prices={prices} />,
    },
    {
      id: 'status',
      header: 'Access',
      cell: ({ row }) => <StatusCell record={row.original} />,
    },
    {
      accessorKey: 'updated_at',
      header: 'Updated',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {formatDate(row.original.updated_at)}
        </span>
      ),
    },
  ]
}

export function SubscribersTable({ data, orgMap, prices, appSlug }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const columns = buildColumns(orgMap, prices)

  const filtered = data.filter((sub) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    const org = orgMap[sub.organization_id]
    return (
      sub.id.toLowerCase().includes(q) ||
      (org?.name && org.name.toLowerCase().includes(q)) ||
      (org?.slug && org.slug.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80 lg:w-96">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subscribers…"
            className="pl-9"
            aria-label="Search subscribers"
          />
        </div>
      </div>

      <div className="876-card overflow-hidden">
        <DataTable
          columns={columns}
          data={filtered}
          emptyState={
            <Empty className="border-border/60 bg-muted/5 border-dashed py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Building2 className="text-cyan-600 dark:text-cyan-400" />
                </EmptyMedia>
                <EmptyTitle className="text-foreground text-base font-semibold">
                  {query.trim() ? 'No matching subscribers' : 'No subscribers'}
                </EmptyTitle>
                <EmptyDescription className="text-muted-foreground/90 max-w-[380px] text-sm leading-relaxed">
                  {query.trim()
                    ? 'No subscribers match the current search.'
                    : 'Subscribers for this application will appear here once organizations subscribe.'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          }
          onRowClick={(subscription) =>
            router.push(`/apps/${appSlug}/subscribers/${subscription.id}`)
          }
        />
      </div>
    </div>
  )
}
