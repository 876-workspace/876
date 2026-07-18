import type { Metadata } from 'next'

import { requireSession } from '@/lib/auth/guards'
import { NoAccessView } from './no-access-view'

export const metadata: Metadata = {
  title: 'No Access | 876',
  robots: { index: false, follow: false },
}

export default async function NoAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>
}) {
  const { slug } = await searchParams
  await requireSession('/no-access')

  return <NoAccessView orgSlug={slug} />
}
