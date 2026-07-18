import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { InvoicesView } from '@/components/detail/detail-views'
import { resolveUser } from '../_data'

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) return { title: 'Invoices' }
  const name =
    [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
  return { title: `${name} • Invoices - Users` }
}

export default async function UserInvoicesPage({ params }: Props) {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) notFound()

  return <InvoicesView subjectType="user" subjectId={user.id} />
}
