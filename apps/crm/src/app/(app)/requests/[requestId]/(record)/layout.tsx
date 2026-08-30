import type { Metadata } from 'next'

import { RequestRecordShell } from '@876/crm-ui/request-record-shell'
import { Page } from '@876/ui/page'

import { requireCrmContext } from '@/lib/auth/require-crm-context'
import { crm } from '@/lib/services/crm'

import {
  RequestIdentity,
  RequestIdentitySkeleton,
  RequestToolbar,
  RequestToolbarSkeleton,
} from '../_components/request-identity'
import {
  RequestAside,
  RequestAsideSkeleton,
} from '../_components/request-aside'

type Props = {
  children: React.ReactNode
  params: Promise<{ requestId: string }>
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ requestId: string }>
}): Promise<Metadata> {
  const context = await requireCrmContext()
  const { requestId } = await params
  const result = await crm.requests.retrieve(context.orgId, requestId)
  if (!result.data) return { title: 'Request' }
  return {
    title: {
      default: `Request #${result.data.number} · ${result.data.subject}`,
      template: `%s · Request #${result.data.number}`,
    },
  }
}

export default async function RequestRecordLayout({ children, params }: Props) {
  const { requestId } = await params
  const base = `/requests/${requestId}`
  return (
    <Page className="mx-auto w-full max-w-[1400px]">
      <RequestRecordShell
        baseHref={base}
        toolbar={<RequestToolbar requestId={requestId} />}
        toolbarFallback={<RequestToolbarSkeleton />}
        header={<RequestIdentity requestId={requestId} />}
        headerFallback={<RequestIdentitySkeleton />}
        aside={<RequestAside requestId={requestId} />}
        asideFallback={<RequestAsideSkeleton />}
      >
        {children}
      </RequestRecordShell>
    </Page>
  )
}
