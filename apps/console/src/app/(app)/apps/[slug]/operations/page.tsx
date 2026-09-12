import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { resolveApp } from '../_data'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'Operations' }
  return { title: `${app.name} Operations` }
}

export default async function AppOperationsPage({ params }: Props) {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app || app.app_kind !== 'product') notFound()

  return null
}
