import { notFound } from 'next/navigation'

import { resolveApp } from '../_data'

type Props = { params: Promise<{ slug: string }> }

export default async function AppAuditPage({ params }: Props) {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app || app.app_kind !== 'product') notFound()

  return null
}
