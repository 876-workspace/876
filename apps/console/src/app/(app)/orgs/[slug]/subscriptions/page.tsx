import { redirect } from 'next/navigation'

type Props = { params: Promise<{ slug: string }> }

export default async function OrganizationSubscriptionsRedirect({
  params,
}: Props) {
  const { slug } = await params
  redirect(`/orgs/${slug}/billing/subscriptions`)
}
