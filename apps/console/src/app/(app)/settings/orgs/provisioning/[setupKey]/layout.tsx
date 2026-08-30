import { Suspense, type ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { Skeleton } from '@876/ui/skeleton'

import { getProvisioningSetup } from './_data'
import { SetupCardFrame } from './_components/setup-card-frame'

export default async function ProvisioningSetupLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ setupKey: string }>
}) {
  const { setupKey } = await params
  return (
    <Suspense
      key={setupKey}
      fallback={
        <div className="876-card h-full p-6">
          <Skeleton className="h-16 w-64" />
        </div>
      }
    >
      <SetupCard setupKey={setupKey}>{children}</SetupCard>
    </Suspense>
  )
}

async function SetupCard({
  setupKey,
  children,
}: {
  setupKey: string
  children: ReactNode
}) {
  const result = await getProvisioningSetup(setupKey)
  if (result.error || !result.data) notFound()
  return <SetupCardFrame setup={result.data}>{children}</SetupCardFrame>
}
