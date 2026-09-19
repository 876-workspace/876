import { workspace } from '@/lib/clients/workspace'
import { Suspense, type ReactNode } from 'react'
import type { AdminProvisioningSetup } from '@876/platform/compat'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { ProvisioningShell } from './_components/provisioning-shell'
import { SetupsList } from './_components/setups-list'
import { SETUPS_SKELETON_COLUMNS } from './_components/setups-skeleton-columns'

export default function ProvisioningLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <ProvisioningShell
      list={
        <Suspense
          fallback={<DataTableSkeleton columns={SETUPS_SKELETON_COLUMNS} />}
        >
          <SetupsListData />
        </Suspense>
      }
    >
      {children}
    </ProvisioningShell>
  )
}

async function SetupsListData() {
  const result = await workspace.provisioning.setups.list()
  if (result.error || !result.data)
    throw new Error(
      result.error?.message ?? 'Failed to load provisioning setups.'
    )

  return <SetupsList setups={result.data.data as AdminProvisioningSetup[]} />
}
