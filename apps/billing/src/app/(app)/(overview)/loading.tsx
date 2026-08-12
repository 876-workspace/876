import { Page } from '@876/ui/page'

import {
  DashboardContentSkeleton,
  DashboardHeader,
} from '@/components/patterns/page-skeleton'

export default function Loading() {
  return (
    <Page className="pb-12">
      <DashboardHeader />
      <DashboardContentSkeleton />
    </Page>
  )
}
