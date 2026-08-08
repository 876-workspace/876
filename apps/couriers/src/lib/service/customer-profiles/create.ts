import { nowUnixSeconds } from '@876/core/timestamps'

import type { CustomerStatus, CustomerView } from '@/types/customer'
import type { ServiceResult } from '@/types/api'

import { isUniqueConstraintError } from '../prisma-errors'
import { reportServiceFailure } from '../report'
import { err, errFrom, ok } from '../result'
import { isColdStartError, runTransaction } from '../transaction'
import { toCustomerView } from './view'

export type CustomerProfileCreateInput = {
  id: string
  billingCustomerId: string
  userId: null
  mailboxNumber: string
  branchId?: string
  trn?: string
  isCommercial?: boolean
  status?: CustomerStatus
}

export async function create(
  tenantId: string,
  params: CustomerProfileCreateInput
): ServiceResult<CustomerView> {
  const now = nowUnixSeconds()
  try {
    const profile = await runTransaction(
      'customerProfiles.create',
      async (tx) => {
        const defaultBranch = params.branchId
          ? null
          : await tx.branch.findFirst({
              where: { tenantId, isDefault: true },
              select: { id: true },
            })
        return tx.courierCustomerProfile.create({
          data: {
            id: params.id,
            tenantId,
            userId: null,
            billingCustomerId: params.billingCustomerId,
            branchId: params.branchId ?? defaultBranch?.id ?? null,
            status: params.status ?? 'ACTIVE',
            trn: params.trn ?? null,
            isCommercial: params.isCommercial ?? false,
            firstSeenAt: now,
            createdAt: now,
            updatedAt: now,
            mailboxes: {
              create: {
                tenantId,
                number: params.mailboxNumber,
                isPrimary: true,
                createdAt: now,
                updatedAt: now,
              },
            },
          },
        })
      }
    )
    return ok(toCustomerView(profile))
  } catch (error) {
    if (isUniqueConstraintError(error))
      return err('A customer with these details already exists.', 409)

    if (isColdStartError(error)) {
      reportServiceFailure(error, {
        operation: 'customerProfiles.create',
        consequence:
          'The customer was not created and the form asks the user to try again shortly.',
      })
      return errFrom('error/database-unavailable')
    }

    console.error('[service.customerProfiles.create]', error)
    reportServiceFailure(error, {
      operation: 'customerProfiles.create',
      consequence:
        'The customer was not created, leaving an orphaned Billing registry row that a retry reuses.',
    })
    return err('Failed to create customer.', 500)
  }
}
