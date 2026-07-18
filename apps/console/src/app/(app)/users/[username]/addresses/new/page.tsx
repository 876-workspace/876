import { notFound } from 'next/navigation'
import { resolveUser } from '../../_data'
import { AddressCreate } from './address-create'

type Props = {
  params: Promise<{ username: string }>
}

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
