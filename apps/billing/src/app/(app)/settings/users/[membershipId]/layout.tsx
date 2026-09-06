import { Suspense, type ReactNode } from 'react'
import { DetailCardHeader } from '@876/ui/detail-card'
import { Skeleton } from '@876/ui/skeleton'
import { MemberCard } from './_components/member-card'
import { MemberHeaderData } from './_components/member-header-data'
export default async function MemberLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ membershipId: string }>
}) {
  const { membershipId } = await params
  return (
    <MemberCard
      membershipId={membershipId}
      header={
        <Suspense
          key={membershipId}
          fallback={
            <DetailCardHeader
              closeHref="/settings/users"
              closeLabel="Close user details"
              title={<Skeleton className="h-6 w-48" />}
              subtitle={<Skeleton className="h-3 w-36" />}
            />
          }
        >
          <MemberHeaderData membershipId={membershipId} />
        </Suspense>
      }
    >
      {children}
    </MemberCard>
  )
}
