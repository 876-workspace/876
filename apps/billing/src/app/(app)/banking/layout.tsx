import { Suspense } from 'react'
import type { ReactNode } from 'react'

import {
  requireBillingFeature,
  requirePagePermission,
} from '@/lib/auth/billing-context'
import { BankingFallback } from './_components/banking-fallback'
import { BankingListData } from './_components/banking-list-data'
import { BankingSection } from './_components/banking-section'

/**
 * Owns the toolbar and the account list for every route under `/banking`.
 *
 * Keeping them here — rather than in each page — is what lets an account open
 * beside the list instead of replacing it, and what keeps the list column a
 * single element across open and close so its width can animate.
 */
export default async function BankingLayout({
  children,
}: {
  children: ReactNode
}) {
  await Promise.all([
    requirePagePermission('banking:read'),
    requireBillingFeature('banking'),
  ])

  return (
    <BankingSection
      list={
        <Suspense fallback={<BankingFallback />}>
          <BankingListData />
        </Suspense>
      }
    >
      {children}
    </BankingSection>
  )
}
