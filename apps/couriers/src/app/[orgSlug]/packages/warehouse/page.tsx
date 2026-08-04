import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export default async function LegacyWarehousePage({ params }: Props) {
  const { orgSlug } = await params
  redirect(`/${orgSlug}/warehouse`)
}
