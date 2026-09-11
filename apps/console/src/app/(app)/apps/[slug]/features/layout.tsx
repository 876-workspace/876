import type { ReactNode } from 'react'

import { FeaturesSection } from './_components/features-section'

type Props = {
  children: ReactNode
  list: ReactNode
  params: Promise<{ slug: string }>
}

/**
 * Owns the toolbar and the feature flags list for every route under
 * `/apps/[slug]/features`.
 *
 * Keeping them here — rather than in each page — is what lets a feature open
 * beside the list instead of replacing it, and what keeps the list column a
 * single element across open and close so its width can animate.
 *
 * The wrapper cancels the app record's page gutter so the section shell owns
 * its own insets (billing bleed parity).
 */
export default async function FeaturesLayout({
  children,
  list,
  params,
}: Props) {
  const { slug } = await params

  return (
    <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8">
      <FeaturesSection slug={slug} list={list}>
        {children}
      </FeaturesSection>
    </div>
  )
}
