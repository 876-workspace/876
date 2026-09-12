import { notFound } from 'next/navigation'
import { resolveUser } from '../../_data'
import { AddressCreate } from './_components/address-create'

type Props = {
  params: Promise<{ username: string }>
}

export const metadata = { title: 'New Address' }

export default async function NewAddressPage({ params }: Props) {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) notFound()

  return (
    <div className="space-y-6">
      <AddressCreate user={user} />
    </div>
  )
}
