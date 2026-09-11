import type { ReactNode } from 'react'

import { SubscribersSection } from './_components/subscribers-section'

type Props = {
  children: ReactNode
  list: ReactNode
}

/**
 * Owns the toolbar and the subscribers list for every route under
 * `/apps/[slug]/subscribers`.
 *
 * Keeping them here — rather than in each page — is what lets a subscription
 * open beside the list instead of replacing it, and what keeps the list
 * column a single element across open and close so its width can animate.
 *
 * The wrapper cancels the app record's page gutter so the section shell owns
 * its own insets (billing bleed parity).
 */
export default function SubscribersLayout({ children, list }: Props) {
  return (
    <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8">
      <SubscribersSection list={list}>{children}</SubscribersSection>
    </div>
  )
}
