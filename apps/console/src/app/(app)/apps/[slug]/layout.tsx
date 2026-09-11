import type { ReactNode } from 'react'
import type { Metadata } from 'next'

import { resolveApp } from './_data'

type Props = {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'App not found' }
  return { title: `${app.name} - Apps` }
}

/**
 * The app detail shell.
 *
 * Navigation lives in the sidebar's app context; the record renders its
 * section directly with no identity band or tab strip.
 */
export default function AppDetailLayout({ children }: Props) {
  return <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
}
