import { z } from 'zod'

import { optionalTextSchema } from './common'
import { minorAmountSchema } from './currency'

export const TaxBehaviorSchema = z.enum(['EXCLUSIVE', 'INCLUSIVE'])
export const LateFeeCalculationTypeSchema = z.enum(['PERCENTAGE', 'FIXED'])

export const InvoicePreferenceUpdateSchema = z
  .strictObject({
    defaultTaxBehavior: TaxBehaviorSchema,
    defaultNotes: optionalTextSchema,
    defaultTerms: optionalTextSchema,
    allowEditingSentInvoices: z.boolean(),
    lateFeesEnabled: z.boolean(),
    lateFeeCalculationType: LateFeeCalculationTypeSchema,
    lateFeePercent: z.number().min(0).max(100).nullable(),
    lateFeeAmount: minorAmountSchema.nullable(),
    lateFeeGraceDays: z.number().int().min(0).max(3650),
    lateFeeGenerateAsDraft: z.boolean(),
  })
  .superRefine((value, context) => {
    if (!value.lateFeesEnabled) return

    if (
      value.lateFeeCalculationType === 'PERCENTAGE' &&
      (!value.lateFeePercent || value.lateFeePercent <= 0)
    )
      context.addIssue({
        code: 'custom',
        message: 'Enter a late-fee percentage greater than zero.',
        path: ['lateFeePercent'],
      })

    if (
      value.lateFeeCalculationType === 'FIXED' &&
      (!value.lateFeeAmount || value.lateFeeAmount <= 0n)
    )
      context.addIssue({
        code: 'custom',
        message: 'Enter a fixed late-fee amount greater than zero.',
        path: ['lateFeeAmount'],
      })
  })

export type InvoicePreferenceUpdateParams = z.infer<
  typeof InvoicePreferenceUpdateSchema
>
export type InvoicePreferenceUpdateInput = z.input<
  typeof InvoicePreferenceUpdateSchema
>

export interface InvoicePreferenceResource {
  object: 'invoice_preference'
  tenantId: string
  defaultTaxBehavior: 'EXCLUSIVE' | 'INCLUSIVE'
  defaultNotes: string | null
  defaultTerms: string | null
  allowEditingSentInvoices: boolean
  lateFeesEnabled: boolean
  lateFeeCalculationType: 'PERCENTAGE' | 'FIXED'
  lateFeePercent: string | null
  lateFeeAmount: string | null
  lateFeeGraceDays: number
  lateFeeGenerateAsDraft: boolean
  createdAt: number
  updatedAt: number
}

export interface InvoicePreferenceUpdated {
  object: 'invoice_preference'
  tenantId: string
}

export interface LateFeeRun {
  object: 'late_fee_run'
  created: number
  skipped: number
  hasMore: boolean
}
