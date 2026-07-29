import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export default async function LegacyDeliveriesPage({ params }: Props) {
  const { orgSlug } = await params
  redirect(`/org/${orgSlug}/deliveries`)
}
