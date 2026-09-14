import { notFound } from 'next/navigation'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
} from '@876/ui/detail-card'
import { getManageContext } from '@/lib/auth/manage-context'
import { ItemForm } from '../_components/item-form'

export const metadata = { title: 'New Item' }
export default async function NewItemPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const access = await getManageContext(orgSlug)
  if (!access?.tenant) notFound()
  return (
    <DetailCard aria-label="New item">
      <DetailCardHeader
        title="New Item"
        closeHref={`/${orgSlug}/items`}
        closeLabel="Close new item"
      />
      <DetailCardBody>
        <ItemForm orgSlug={orgSlug} currency="JMD" />
      </DetailCardBody>
    </DetailCard>
  )
}
