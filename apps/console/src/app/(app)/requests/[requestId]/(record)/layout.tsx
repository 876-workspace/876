import type { Metadata } from 'next'

import { Page } from '@876/ui/page'

import { RequestRecordShell } from '@/features/crm/components/request-record-shell'
import { PLATFORM_REQUESTS_HREF } from '@/features/crm/request-paths'
import { getPlatformOrganization } from '@/lib/platform-org'
import { crm } from '@/lib/services/crm'

type Props = {
  children: React.ReactNode
  params: Promise<{ requestId: string }>
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ requestId: string }>
}): Promise<Metadata> {
  const org = await getPlatformOrganization()
  if (!org) return { title: 'Requests' }
  const { requestId } = await params
  const result = await crm.requests.retrieve(org.id, requestId)
  if (!result.data) return { title: 'Request' }

  return {
    title: {
      default: `Request #${result.data.number} · ${result.data.subject}`,
      template: `%s · Request #${result.data.number}`,
    },
  }
}

/**
 * Console's operator request surface over 876's CRM service workspace.
 *
 * Awaits `params` and nothing else; the record itself is the shared shell, so
 * this surface and an organization's CRM workspace stay identical by
 * construction. The CRM workspace exists independently of any standalone CRM
 * product entitlement.
 */
export default async function RequestRecordLayout({ children, params }: Props) {
  const { requestId } = await params

  return (
    <Page className="mx-auto w-full max-w-[1400px]">
      <RequestRecordShell
        requestId={requestId}
        baseHref={`${PLATFORM_REQUESTS_HREF}/${requestId}`}
      >
        {children}
      </RequestRecordShell>
    </Page>
  )
}
