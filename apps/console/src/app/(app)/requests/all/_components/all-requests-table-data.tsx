import { AppError } from '@876/ui/app-error'

import { listRequestsAcrossOrganizations } from '@/lib/clients/crm'
import type { CrmRequestStatus } from '@/types/crm'

import { AllRequestsTable } from './all-requests-table'

type Props = {
  searchParams: Promise<{ status?: string; after?: string }>
  status: CrmRequestStatus | 'all'
}

export async function AllRequestsTableData({ searchParams, status }: Props) {
  const { after } = await searchParams
  const result = await listRequestsAcrossOrganizations(undefined, {
    status: status === 'all' ? undefined : status,
    limit: 25,
    startingAfter: after,
  })
  const requests = result.data?.data ?? []

  return (
    <div className="space-y-3">
      {result.error ? (
        <AppError
          title="Some request data could not be loaded"
          error={result.error}
          variant="banner"
          showCode
        />
      ) : null}
      <AllRequestsTable data={requests} />
    </div>
  )
}
