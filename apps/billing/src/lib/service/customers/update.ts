import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma, type PrismaTransaction } from '@/lib/db'
import type { CustomerUpdateParams } from '@/types/customer'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'
import { hasEnabledCurrency, isUniqueConstraintError } from '../shared'

/** Updates a billing customer's details. */
export async function update(
  tenantId: string,
  customerId: string,
  params: CustomerUpdateParams,
  database: PrismaTransaction = prisma
): ServiceResult<{ id: string }> {
  if (Object.keys(params).length === 0) return err('Nothing to update.', 422)

  if (typeof params.currency === 'string') {
    if (!(await hasEnabledCurrency(tenantId, params.currency, database))) {
      return err('Enable the customer currency before using it.', 422)
    }
  }

  const [paymentTerm, salesperson, priceList] = await Promise.all([
    params.paymentTermId
      ? database.paymentTerm.findFirst({
          where: { id: params.paymentTermId, tenantId, isActive: true },
          select: { id: true },
        })
      : null,
    params.salespersonId
      ? database.salesperson.findFirst({
          where: { id: params.salespersonId, tenantId, isActive: true },
          select: { id: true },
        })
      : null,
    params.priceListId
      ? database.priceList.findFirst({
          where: { id: params.priceListId, tenantId, isActive: true },
          select: { id: true },
        })
      : null,
  ])
  if (params.paymentTermId && !paymentTerm)
    return err('Payment term not found.', 404)
  if (params.salespersonId && !salesperson)
    return err('Salesperson not found.', 404)
  if (params.priceListId && !priceList)
    return err('Active price list not found.', 404)

  const data: Record<string, unknown> = {
    updatedAt: nowUnixSeconds(),
  }

  if (params.name !== undefined) data.name = params.name
  if (params.customerKind !== undefined) data.customerKind = params.customerKind
  if (params.salutation !== undefined) data.salutation = params.salutation
  if (params.firstName !== undefined) data.firstName = params.firstName
  if (params.lastName !== undefined) data.lastName = params.lastName
  if (params.companyName !== undefined) data.companyName = params.companyName
  if (params.email !== undefined) data.email = params.email
  if (params.phone !== undefined) data.phone = params.phone
  if (params.workPhone !== undefined) data.workPhone = params.workPhone
  if (params.customerNumber !== undefined)
    data.customerNumber = params.customerNumber
  if (params.website !== undefined) data.website = params.website
  if (params.notes !== undefined) data.notes = params.notes
  if (params.taxRegistrationNumber !== undefined)
    data.taxRegistrationNumber = params.taxRegistrationNumber
  if (params.currency !== undefined) data.defaultCurrency = params.currency
  if (params.language !== undefined) data.language = params.language
  if (params.status !== undefined) data.status = params.status
  if (params.paymentTermId !== undefined)
    data.paymentTermId = params.paymentTermId
  if (params.salespersonId !== undefined)
    data.salespersonId = params.salespersonId
  if (params.priceListId !== undefined) data.priceListId = params.priceListId
  if (params.taxBehaviorOverride !== undefined)
    data.taxBehaviorOverride = params.taxBehaviorOverride
  if (params.lateFeeExempt !== undefined)
    data.lateFeeExempt = params.lateFeeExempt
  if (params.invoiceNotes !== undefined) data.invoiceNotes = params.invoiceNotes
  if (params.invoiceTerms !== undefined) data.invoiceTerms = params.invoiceTerms

  try {
    const result = await database.customer.updateMany({
      where: { id: customerId, tenantId },
      data,
    })

    if (result.count === 0) return err('Customer not found.', 404)

    return ok({ id: customerId })
  } catch (error) {
    if (isUniqueConstraintError(error))
      return err(
        'A customer with this customer number already exists in this workspace.',
        409
      )

    console.error('[billing.service.customers.update]', error)
    return err('Failed to update the customer.', 500)
  }
}
