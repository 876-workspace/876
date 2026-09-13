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
  return { title: `${id} - Deliveries` }
}

/**
 * The delivery record card in the detail column. Awaits `params` and nothing
 * else. There is no deliveries retrieve yet, so the card carries the id and
 * the close affordance while the record sections stay empty.
 */
export default async function DeliveryDetailLayout({
  children,
  params,
}: Props) {
  const { orgSlug, id } = await params
  const closeHref = `/${orgSlug}/deliveries`

  return (
    <DetailCard aria-label="Delivery">
      <DetailCardHeader
        title={id}
        closeHref={closeHref}
        closeLabel="Close delivery details"
      />
      <DetailCardBody>{children}</DetailCardBody>
    </DetailCard>
  )
}
