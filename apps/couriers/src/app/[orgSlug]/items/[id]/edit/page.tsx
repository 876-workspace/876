import { notFound } from 'next/navigation'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
} from '@876/ui/detail-card'
import { ItemForm } from '../../_components/item-form'
import { resolveItem } from '../_lib/item-data'

export const metadata = { title: 'Edit Item' }
export default async function EditItemPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>
}) {
  const { orgSlug, id } = await params
  const resolved = await resolveItem(orgSlug, id)
  if (!resolved?.item) notFound()
  const item = resolved.item
  return (
    <DetailCard aria-label="Edit item">
      <DetailCardHeader
        title="Edit Item"
        closeHref={`/${orgSlug}/items/${id}`}
        closeLabel="Close item editor"
      />
      <DetailCardBody>
        <ItemForm
          orgSlug={orgSlug}
          currency={item.defaultSellingCurrency ?? 'JMD'}
          item={item}
        />
      </DetailCardBody>
    </DetailCard>
  )
}
