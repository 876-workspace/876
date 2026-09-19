import { AppError } from '@876/ui/app-error'
import type { AdminOrganization, AdminSubscription } from '@876/platform/compat'

import { platform } from '@/lib/clients/platform'
import { workspace } from '@/lib/clients/workspace'
import { isOrgStatus } from '@/lib/status'
import { OrgsList } from './orgs-list'

export async function OrgsListData({
  after,
  before,
  q,
  status,
}: {
  after?: string
  before?: string
  q?: string
  status?: string
}) {
  const selectedStatus =
    status === 'all' || !isOrgStatus(status) ? 'all' : status
  const orgStatus = selectedStatus === 'all' ? undefined : selectedStatus
  const isSearching = Boolean(q?.trim())
  const result = isSearching
    ? await platform.organizations.search({
        query: q!.trim(),
        limit: 50,
        status: orgStatus,
      })
    : await platform.organizations.list({
        limit: 25,
        startingAfter: after,
        endingBefore: before,
        status: orgStatus,
      })

  const orgs: AdminOrganization[] = result.data?.data ?? []
  const hasMore = isSearching ? false : (result.data?.has_more ?? false)

  const subscriptionsMap: Record<string, AdminSubscription[]> = {}
  let subscriptionsError: typeof result.error = null
  if (orgs.length > 0) {
    const batchResult = await workspace.organizations.subscriptions.list({
      organizationIds: orgs.map((o) => o.id),
    })
    if (batchResult.data) {
      for (const row of batchResult.data.data) {
        if (!subscriptionsMap[row.organization_id])
          subscriptionsMap[row.organization_id] = []
        subscriptionsMap[row.organization_id]!.push(row)
      }
    } else {
      subscriptionsError = batchResult.error
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {result.error ? (
        <AppError
          title="Some organization data could not be loaded"
          error={result.error}
          variant="banner"
          showCode
        />
      ) : null}
      {subscriptionsError ? (
        <AppError
          title="Organization subscriptions could not be loaded"
          error={subscriptionsError}
          variant="banner"
          showCode
        />
      ) : null}
      <OrgsList
        orgs={orgs}
        subscriptionsMap={subscriptionsMap}
        isSearching={isSearching}
        hasMore={hasMore}
        firstId={orgs[0]?.id ?? null}
        lastId={orgs[orgs.length - 1]?.id ?? null}
      />
    </div>
  )
}
