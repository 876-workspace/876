import type { ReactNode } from 'react'

import { PlansSection } from './_components/plans-section'

type Props = {
  children: ReactNode
  list: ReactNode
  params: Promise<{ slug: string }>
}

/**
 * Owns the toolbar, search, and the plans list for every route under
 * `/apps/[slug]/plans`.
 *
 * Keeping them here — rather than in each page — is what lets a plan open
 * beside the list instead of replacing it, and what keeps the list column a
 * single element across open and close so its width can animate.
 *
 * The wrapper cancels the app record's page gutter so the section shell owns
 * its own insets (billing bleed parity).
 */
export default async function PlansLayout({ children, list, params }: Props) {
  const { slug } = await params

  return (
    <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8">
      <PlansSection slug={slug} list={list}>
        {children}
      </PlansSection>
    </div>
  )
}
