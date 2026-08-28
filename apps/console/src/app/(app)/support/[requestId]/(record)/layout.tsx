import type { Metadata } from 'next'

import { Page } from '@876/ui/page'

import { RequestRecordShell } from '@/features/crm/components/request-record-shell'
import { $876 } from '@/lib/876'
import { getPlatformOrganization } from '@/lib/platform-org'

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
  if (!org) return { title: 'Support' }
  const { requestId } = await params
  const result = await $876.requests.retrieve(org.id, requestId)
  if (!result.data) return { title: 'Request' }

  return {
    title: {
      default: `Request #${result.data.number} · ${result.data.subject}`,
      template: `%s · Request #${result.data.number}`,
    },
  }
}

/**
 * The platform support desk's request record.
 *
 * Awaits `params` and nothing else; the record itself is the shared shell, so
 * this desk and an organization's CRM workspace stay identical by construction.
 */
export default async function SupportRequestRecordLayout({
  children,
  params,
}: Props) {
  const { requestId } = await params

  return (
    <Page className="mx-auto w-full max-w-[1400px]">
      <RequestRecordShell
        requestId={requestId}
        baseHref={`/support/${requestId}`}
      >
        {children}
      </RequestRecordShell>
    </Page>
  )
}
