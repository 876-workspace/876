import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { NotesView } from '@/components/detail/detail-views'
import { resolveOrg } from '../_data'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Notes' }
  return { title: `${org.name ?? org.slug} • Notes - Organizations` }
}

export default async function OrganizationNotesPage({ params }: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return <NotesView subjectType="organization" subjectId={org.id} />
}
