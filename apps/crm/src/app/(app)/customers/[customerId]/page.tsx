import { redirect } from 'next/navigation'

type Props = { params: Promise<{ customerId: string }> }

export const metadata = { title: 'Customer' }

export default async function CustomerPage({ params }: Props) {
  const { customerId } = await params
  redirect(`/customers?customer=${encodeURIComponent(customerId)}`)
}
