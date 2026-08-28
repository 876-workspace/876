import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { RequestRecordShell } from '@/features/crm/components/request-record-shell'
import { $876 } from '@/lib/876'
import { resolveOrg } from '../../../../../_data'

type Props = {
  children: React.ReactNode
  params: Promise<{ slug: string; requestId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, requestId } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Request' }
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
 * An organization's CRM request, opened from its Console workspace.
 *
 * Renders the same shell as the support desk and as 876 CRM itself; the only
 * difference is the organization it is scoped to and the path it lives at. The
 * workspace shell already supplies the page padding, so the record only sets
 * its own measure here.
 */
export default async function OrgRequestRecordLayout({
  children,
  params,
}: Props) {
  const { slug, requestId } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return (
    <RequestRecordShell
      className="mx-auto w-full max-w-[1400px]"
      organizationId={org.id}
      requestId={requestId}
      baseHref={`/orgs/${slug}/workspace/crm/requests/${requestId}`}
    >
      {children}
    </RequestRecordShell>
  )
}
