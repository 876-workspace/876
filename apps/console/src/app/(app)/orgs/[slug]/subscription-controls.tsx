'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminSubscription } from '@876/admin'

import { request } from '@/lib/client/request'

export type ProvisionableApp = { slug: string; label: string }

type Props = {
  orgId: string
  access: AdminSubscription[]
  apps: ProvisionableApp[]
}

export function SubscriptionControls({ orgId, access, apps }: Props) {
  return (
    <ul className="divide-y">
      {apps.map((app) => {
        const record = access.find((a) => a.app_slug === app.slug)
        return (
          <AppRow
            key={app.slug}
            orgId={orgId}
            app={app}
            record={record ?? null}
          />
        )
      })}
    </ul>
  )
}

function AppRow({
  orgId,
  app,
  record,
}: {
  orgId: string
  app: ProvisionableApp
  record: AdminSubscription | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [optimisticStatus, setOptimisticStatus] = useState<
    'active' | 'blocked' | null
  >(null)
  const [error, setError] = useState<string | null>(null)

  const effectiveStatus = optimisticStatus ?? record?.status ?? null

  async function provision() {
    setOptimisticStatus('active')
    setError(null)

    const result = await request<AdminSubscription>(
      `/api/organizations/${orgId}/apps`,
      {
        method: 'POST',
        body: JSON.stringify({ app_slug: app.slug }),
      }
    )
    if (result.error) {
      setOptimisticStatus(null)
      setError(result.error.message)
      return
    }

    startTransition(() => router.refresh())
  }

  async function toggle() {
    if (!record) return
    const next: 'active' | 'blocked' =
      effectiveStatus === 'active' ? 'blocked' : 'active'
    setOptimisticStatus(next)
    setError(null)

    const result = await request<AdminSubscription>(
      `/api/organizations/${orgId}/apps/${record.app_id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      }
    )
    if (result.error) {
      setOptimisticStatus(null)
      setError(result.error.message)
      return
    }

    startTransition(() => router.refresh())
  }

  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{app.label}</p>
        <p className="text-muted-foreground text-xs">
          <span className="capitalize">
            {effectiveStatus ?? 'not provisioned'}
          </span>
          {record?.items[0]?.product_slug && (
            <span> · {record.items[0].product_slug}</span>
          )}
        </p>
      </div>

      {error && <p className="text-destructive text-xs">{error}</p>}

      {!record ? (
        <button
          type="button"
          disabled={isPending || optimisticStatus !== null}
          onClick={() => void provision()}
          className="text-muted-foreground hover:text-foreground shrink-0 text-xs transition-colors disabled:opacity-50"
        >
          Provision
        </button>
      ) : (
        <button
          type="button"
          disabled={isPending}
          onClick={() => void toggle()}
          className={[
            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50',
            effectiveStatus === 'active' ? 'bg-foreground' : 'bg-input',
          ].join(' ')}
          role="switch"
          aria-checked={effectiveStatus === 'active'}
          aria-label={`${app.label} access`}
        >
          <span
            className={[
              'bg-background pointer-events-none block size-[18px] rounded-full shadow-sm transition-transform',
              effectiveStatus === 'active'
                ? 'translate-x-[calc(100%-1px)]'
                : 'translate-x-0',
            ].join(' ')}
          />
        </button>
      )}
    </li>
  )
}
