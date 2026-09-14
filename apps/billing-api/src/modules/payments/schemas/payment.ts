import { z } from 'zod'

import {
  IdSchema,
  optionalShortTextSchema,
  optionalTextSchema,
  unixTimestampSchema,
} from './common'
import { currencyCodeSchema, minorAmountSchema } from './currency'

const positiveMinorAmountSchema = minorAmountSchema.refine(
  (amount) => amount > 0n,
  'Enter an amount greater than zero.'
)

export const PaymentModeCreateSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  isDefault: z.boolean().optional(),
})

export const PaymentModeUpdateSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(120).optional(),
    isDefault: z.boolean().optional(),
    isActive: z.boolean().optional(),
    imageFileId: z.string().startsWith('file_').nullable().optional(),
    imageUrl: z
      .url({ protocol: /^https$/ })
      .nullable()
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update.')
  // The URL is only a display cache of the Storage file, so it may never be
  // written on its own or outlive the file it describes.
  .refine(
    (value) =>
      value.imageUrl === undefined ||
      (value.imageUrl === null
        ? value.imageFileId === null
        : typeof value.imageFileId === 'string'),
    'An image URL must be sent together with its Storage file.'
  )
  .refine(
    (value) => !(typeof value.imageFileId === 'string' && !value.imageUrl),
    'A Storage image file must be sent with its display URL.'
  )

export const PaymentAllocationSchema = z.strictObject({
  invoiceId: IdSchema,
  amount: positiveMinorAmountSchema,
})

const paymentCreateShape = {
  customerId: IdSchema,
  paymentModeId: IdSchema,
  depositAccountId: IdSchema,
  amount: positiveMinorAmountSchema,
  bankCharges: minorAmountSchema.optional(),
  currency: currencyCodeSchema,
  paymentDate: unixTimestampSchema,
  referenceNumber: optionalShortTextSchema,
  notes: optionalTextSchema,
  allocations: z.array(PaymentAllocationSchema).max(100).default([]),
}

function paymentCreateSchema(integration: boolean) {
  return z
    .strictObject({
      ...paymentCreateShape,
      ...(integration
        ? { sourceExternalReference: IdSchema.nullable().optional() }
        : {}),
    })
    .superRefine((value, context) => {
      const bankCharges = value.bankCharges ?? 0n
      if (bankCharges >= value.amount)
        context.addIssue({
          code: 'custom',
          message: 'Bank charges must be less than the payment amount.',
          path: ['bankCharges'],
        })

      const invoiceIds = new Set<string>()
      for (const [index, allocation] of value.allocations.entries()) {
        if (invoiceIds.has(allocation.invoiceId))
          context.addIssue({
            code: 'custom',
            message: 'Each invoice can be allocated only once.',
            path: ['allocations', index, 'invoiceId'],
          })
        invoiceIds.add(allocation.invoiceId)
      }

      const allocated = value.allocations.reduce(
        (total, allocation) => total + allocation.amount,
        0n
      )
      if (allocated > value.amount)
        context.addIssue({
          code: 'custom',
          message: 'Invoice allocations cannot exceed the payment amount.',
          path: ['allocations'],
        })
    })
    .transform((value) => ({
      ...value,
      bankCharges: value.bankCharges ?? 0n,
    }))
}

export const PaymentCreateSchema = paymentCreateSchema(false)
export const IntegrationPaymentCreateSchema = paymentCreateSchema(true)

export const PaymentUpdateSchema = PaymentCreateSchema

export const PaymentApplySchema = z.strictObject({
  allocations: z.array(PaymentAllocationSchema).min(1).max(100),
})

export type PaymentModeCreateParams = z.infer<typeof PaymentModeCreateSchema>
export type PaymentModeCreateInput = z.input<typeof PaymentModeCreateSchema>
export type PaymentModeUpdateParams = z.infer<typeof PaymentModeUpdateSchema>
export type PaymentModeUpdateInput = z.input<typeof PaymentModeUpdateSchema>
export type PaymentAllocationParams = z.infer<typeof PaymentAllocationSchema>
export type PaymentAllocationInput = z.input<typeof PaymentAllocationSchema>
export type PaymentCreateParams = z.infer<typeof PaymentCreateSchema>
export type PaymentCreateInput = z.input<typeof PaymentCreateSchema>
export type PaymentUpdateParams = z.infer<typeof PaymentUpdateSchema>
export type PaymentUpdateInput = z.input<typeof PaymentUpdateSchema>
export type PaymentApplyParams = z.infer<typeof PaymentApplySchema>

export interface PaymentModeCreated {
  object: 'payment_mode'
  id: string
}

export interface PaymentCreated {
  object: 'payment'
  id: string
}

export interface PaymentModeUpdated {
  object: 'payment_mode'
  id: string
}

export interface PaymentUpdated {
  object: 'payment'
  id: string
}

export interface PaymentModeDeleted {
  object: 'payment_mode'
  id: string
  deleted: true
}

export interface PaymentDeleted {
  object: 'payment'
  id: string
  deleted: true
}

export interface PaymentModeResource {
  object: 'payment_mode'
  id: string
  name: string
  isDefault: boolean
  isActive: boolean
  isSystem: boolean
  imageFileId: string | null
  imageUrl: string | null
  createdAt: number
  updatedAt: number
}

export interface PaymentResource {
  object: 'payment'
  id: string
  number: string
  amount: string
  unappliedAmount: string
  amountRefunded: string
  status:
    | 'PENDING'
    | 'REQUIRES_ACTION'
    | 'AUTHORIZED'
    | 'PROCESSING'
    | 'SUCCEEDED'
    | 'FAILED'
    | 'CANCELED'
    | 'PARTIALLY_REFUNDED'
    | 'REFUNDED'
    | 'DISPUTED'
  providerConnectionId?: string | null
  providerPaymentId?: string | null
  bankCharges: string
  currency: string
  paymentDate: number
  referenceNumber: string | null
  notes: string | null
  customer: {
    object: 'customer'
    id: string
    name: string
  }
  paymentMode: PaymentModeResource
  depositAccount: {
    object: 'bank_account'
    id: string
    name: string
    accountType: string
    currency: string
  }
  invoiceAllocations: Array<{
    object: 'payment_allocation'
    id: string
    amount: string
    createdAt: number
    updatedAt: number
    invoice: {
      object: 'invoice'
      id: string
      number: string
      totalAmount: string
      amountDue: string
      status: string
    }
  }>
  refunds?: Array<{
    object: 'refund'
    id: string
    number: string
    amount: string
    currency: string
    reason: string | null
    refundedAt: number
    createdAt: number
  }>
  createdAt: number
  updatedAt: number
}
