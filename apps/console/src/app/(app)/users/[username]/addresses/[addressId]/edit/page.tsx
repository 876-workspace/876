import { notFound } from 'next/navigation'
import type { AdminAddress } from '@876/admin'
import { resolveUser, resolveUserAddresses } from '../../../_data'
import { AddressEdit } from './address-edit'

type Props = {
  params: Promise<{ username: string; addressId: string }>
}

export default async function EditAddressPage({ params }: Props) {
  const { username, addressId } = await params
  const user = await resolveUser(username)
  if (!user) notFound()

  const addresses = await resolveUserAddresses(user.id)
  const address = addresses.find(
    (address: AdminAddress) => address.id === addressId
  )
  if (!address) notFound()

  return (
    <div className="space-y-6">
      <AddressEdit user={user} address={address} />
    </div>
  )
}
