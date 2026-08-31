import { Suspense, type ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { Skeleton } from '@876/ui/skeleton'

import { getProvisioningCatalog, getProvisioningSetup } from './_data'
import { SetupCardFrame } from './_components/setup-card-frame'
import { getDefinitionType } from './setup-type-utils'

export default async function ProvisioningSetupLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ setupKey: string }>
}) {
  const { setupKey } = await params
  return (
    <Suspense key={setupKey} fallback={<SetupCardFallback />}>
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
  const [setupResult, catalogResult] = await Promise.all([
    getProvisioningSetup(setupKey),
    getProvisioningCatalog(setupKey),
  ])
  if (setupResult.error || !setupResult.data) notFound()

  const resourceTypes =
    catalogResult.data?.resource_types.map((def) => ({
      key: getDefinitionType(def),
      label: def.label,
    })) ?? []

  return (
    <SetupCardFrame setup={setupResult.data} resourceTypes={resourceTypes}>
      {children}
    </SetupCardFrame>
  )
}

function SetupCardFallback() {
  return (
    <div className="876-card h-full p-6">
      <Skeleton className="h-16 w-64" />
    </div>
  )
}
