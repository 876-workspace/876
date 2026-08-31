import { Suspense, type ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { Skeleton } from '@876/ui/skeleton'

import { getProvisioningSetup } from './_data'
import { SetupCardFrame } from './_components/setup-card-frame'
import { SetupDeleteAction } from './_components/setup-delete-action'

export default async function ProvisioningSetupLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ setupKey: string }>
}) {
  const { setupKey } = await params

  return (
    <SetupCardFrame
      setupKey={setupKey}
      title={
        <Suspense fallback={<SetupTitleFallback />}>
          <SetupTitle setupKey={setupKey} />
        </Suspense>
      }
      actions={
        <Suspense fallback={<SetupActionsFallback />}>
          <SetupActions setupKey={setupKey} />
        </Suspense>
      }
      footer={
        <Suspense fallback={<SetupFooterFallback />}>
          <SetupFooter setupKey={setupKey} />
        </Suspense>
      }
    >
      {children}
    </SetupCardFrame>
  )
}

async function SetupTitle({ setupKey }: { setupKey: string }) {
  const result = await getProvisioningSetup(setupKey)
  if (result.error || !result.data) notFound()

  const setup = result.data

  return (
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="text-foreground truncate text-lg font-semibold tracking-tight sm:text-xl">
        {setup.name}
      </h2>
      {setup.is_default ? <Badge variant="info">Default</Badge> : null}
      {setup.status === 'archived' ? (
        <Badge variant="secondary">Archived</Badge>
      ) : null}
    </div>
  )
}

function SetupTitleFallback() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-6 w-44" />
    </div>
  )
}

async function SetupActions({ setupKey }: { setupKey: string }) {
  const result = await getProvisioningSetup(setupKey)
  if (!result.data) return null
  return <SetupDeleteAction setup={result.data} />
}

function SetupActionsFallback() {
  return <Skeleton className="size-8 rounded-md" />
}

async function SetupFooter({ setupKey }: { setupKey: string }) {
  const result = await getProvisioningSetup(setupKey)
  if (!result.data) return null
  return <>{result.data.id}</>
}

function SetupFooterFallback() {
  return <Skeleton className="h-3 w-28" />
}
