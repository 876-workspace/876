import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
} from '@876/ui/detail-card'

type Props = {
  children: ReactNode
  params: Promise<{ orgSlug: string; id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return { title: `${id} - Pre-alerts` }
}

/**
 * The pre-alert record card in the detail column. Awaits `params` and nothing
 * else. There is no pre-alerts retrieve yet, so the card carries the id and
 * the close affordance while the record sections stay empty.
 */
export default async function PreAlertDetailLayout({
  children,
  params,
}: Props) {
  const { orgSlug, id } = await params
  const closeHref = `/${orgSlug}/packages/pre-alerts`

  return (
    <DetailCard aria-label="Pre-alert">
      <DetailCardHeader
        title={id}
        closeHref={closeHref}
        closeLabel="Close pre-alert details"
      />
      <DetailCardBody>{children}</DetailCardBody>
    </DetailCard>
  )
}
