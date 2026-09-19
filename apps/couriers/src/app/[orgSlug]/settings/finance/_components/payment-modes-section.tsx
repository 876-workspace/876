import type { PaymentMode } from '@876/billing'
import { AppError, type AppErrorValue } from '@876/ui/app-error'

import { getAppError } from '@/lib/errors'
import { resolveFinanceErrorCode } from '@/lib/errors/finance'
import { createBillingIntegration } from '@/lib/clients/billing'

import { PaymentModesPanel } from './finance-panels'

type Props = { orgId: string; orgSlug: string; canManage: boolean }

type ViewProps = {
  orgSlug: string
  modes: PaymentMode[]
  canManage: boolean
  error: AppErrorValue | null
}

/** Loads payment modes for the Finance page's Payment modes section. */
export async function PaymentModesSection({
  orgId,
  orgSlug,
  canManage,
}: Props) {
  const billing = createBillingIntegration()
  const result = await billing.paymentModes.list(orgId)

  return (
    <PaymentModesSectionView
      orgSlug={orgSlug}
      canManage={canManage}
      modes={result.data?.data ?? []}
      error={
        result.error
          ? getAppError(
              resolveFinanceErrorCode('payment-mode', result.error.code)
            )
          : null
      }
    />
  )
}

/** Renders the Payment modes section, isolating its failure from siblings. */
export function PaymentModesSectionView({
  orgSlug,
  modes,
  canManage,
  error,
}: ViewProps) {
  if (error)
    return (
      <AppError
        title="Payment modes could not be loaded"
        error={error}
        variant="section"
      />
    )

  return (
    <PaymentModesPanel orgSlug={orgSlug} modes={modes} canManage={canManage} />
  )
}
