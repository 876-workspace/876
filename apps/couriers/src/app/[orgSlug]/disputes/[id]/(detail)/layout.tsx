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
  return { title: `${id} - Disputes` }
}

/**
 * The dispute record card in the detail column. Awaits `params` and nothing
 * else. There is no disputes retrieve yet, so the card carries the id and
 * the close affordance while the record sections stay empty.
 */
export default async function DisputeDetailLayout({ children, params }: Props) {
  const { orgSlug, id } = await params
  const closeHref = `/${orgSlug}/disputes`

  return (
    <DetailCard aria-label="Dispute">
      <DetailCardHeader
        title={id}
        closeHref={closeHref}
        closeLabel="Close dispute details"
      />
      <DetailCardBody>{children}</DetailCardBody>
    </DetailCard>
  )
}
