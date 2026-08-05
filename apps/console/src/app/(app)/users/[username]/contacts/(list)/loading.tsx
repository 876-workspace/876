'use client'

import { useParams } from 'next/navigation'
import { ContactsPageSkeleton } from '../_components/contacts-page-skeleton'

export default function Loading() {
  const { username } = useParams<{ username: string }>()
  return <ContactsPageSkeleton username={username} />
}
