'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@876/ui/alert-dialog'
import { Button } from '@876/ui/button'
import { Loader2Icon, RefreshCw, Trash } from '@876/ui/icons'

import { client } from '@/lib/client'

type Props = {
  connectionId: string
  connectionName: string
  status: 'pending' | 'active' | 'disabled' | 'error'
  canManage: boolean
}

type PendingAction = 'authorize' | 'validate' | 'reconcile' | 'disable' | null

export function ConnectionActions({
  connectionId,
  connectionName,
  status,
  canManage,
}: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [disableOpen, setDisableOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [isPending, startTransition] = useTransition()

  function run(
    action: Exclude<PendingAction, null>,
    task: () => Promise<{ data: unknown; error: { message: string } | null }>,
    onSuccess?: (data: unknown) => void
  ) {
    setError(null)
    setPendingAction(action)
    startTransition(async () => {
      const result = await task()
      if (result.error) {
        setError(result.error.message)
        setPendingAction(null)
        return
      }
      onSuccess?.(result.data)
      setPendingAction(null)
      router.refresh()
    })
  }

  if (!canManage) return null

  const canValidate = status === 'active'
  const canReconcile = status === 'active'
  const canDisable = status !== 'disabled'

  return (
    <div className="flex min-w-0 flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {status !== 'active' ? (
          <Button
            size="sm"
            disabled={isPending}
            onClick={() =>
              run(
                'authorize',
                () =>
                  client.accountingProviders.connections.authorize(connectionId),
                (data) => {
                  const authorization = data as { authorizeUrl?: unknown } | null
                  if (typeof authorization?.authorizeUrl === 'string')
                    window.location.assign(authorization.authorizeUrl)
                }
              )
            }
          >
            {pendingAction === 'authorize' ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : null}
            {status === 'pending' ? 'Connect' : 'Reconnect'}
          </Button>
        ) : null}

        {status === 'active' ? (
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/settings/accounting-providers/${encodeURIComponent(connectionId)}/imports`}
            >
              Adopt records
            </Link>
          </Button>
        ) : null}

        {canValidate ? (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() =>
              run('validate', () =>
                client.accountingProviders.connections.validate(connectionId)
              )
            }
          >
            {pendingAction === 'validate' ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : null}
            Validate
          </Button>
        ) : null}

        {canReconcile ? (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() =>
              run('reconcile', () =>
                client.accountingProviders.connections.reconcile(connectionId)
              )
            }
          >
            {pendingAction === 'reconcile' ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Reconcile
          </Button>
        ) : null}

        {canDisable ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => setDisableOpen(true)}
          >
            Disable
          </Button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-destructive max-w-sm text-xs sm:text-right">
          {error}
        </p>
      ) : null}

      <AlertDialog open={disableOpen} onOpenChange={setDisableOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10">
              <Trash className="text-destructive size-6" />
            </AlertDialogMedia>
            <AlertDialogTitle>Disable accounting connection?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground font-medium">
                {connectionName}
              </strong>{' '}
              will stop synchronizing. Billing data and existing provider
              records are retained, but the stored provider authorization is
              removed and reconnecting will require OAuth again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={() =>
                run(
                  'disable',
                  () =>
                    client.accountingProviders.connections.disable(connectionId),
                  () => setDisableOpen(false)
                )
              }
            >
              {pendingAction === 'disable' ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <Trash className="size-4" />
              )}
              Disable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
