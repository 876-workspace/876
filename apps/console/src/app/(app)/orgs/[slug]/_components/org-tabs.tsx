import { Suspense } from 'react'
import { Skeleton } from '@876/ui/skeleton'
import type { RouteTabItem } from '@876/ui/route-tabs'

import { resolveOrg, resolveOrgMembers } from '../_data'

/**
 * The organization detail tab set.
 *
 * Every tab is static; only the Members label carries a count, and that count
 * already streams into its own boundary. So the whole strip can be built without
 * awaiting anything, which is what lets the header render the moment you click a
 * row instead of after two round trips.
 */
export function orgTabs(base: string, slug: string): RouteTabItem[] {
  return [
    { label: 'Overview', href: base, exact: true },
    { label: <MemberTabLabel slug={slug} />, href: `${base}/members` },
    { label: 'Onboarding', href: `${base}/onboarding` },
    { label: 'Billing', href: `${base}/billing` },
    { label: 'Activity', href: `${base}/activity` },
    { label: 'Notes', href: `${base}/notes` },
  ]
}

function MemberTabLabel({ slug }: { slug: string }) {
  return (
    <Suspense
      fallback={
        <>
          <span>Members</span>{' '}
          <Skeleton className="inline-block h-3 w-5 align-middle" />
        </>
      }
    >
      <MemberCountLabel slug={slug} />
    </Suspense>
  )
}

async function MemberCountLabel({ slug }: { slug: string }) {
  const org = await resolveOrg(slug)
  if (!org) return <>Members</>

  const membersResult = await resolveOrgMembers(org.id)
  return <>Members ({membersResult?.data.length ?? 0})</>
}
