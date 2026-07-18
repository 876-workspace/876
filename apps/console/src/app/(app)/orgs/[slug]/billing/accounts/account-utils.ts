import type {
  AdminBillingAccount,
  AdminBillingAccountCreateParams,
  AdminBillingAccountUpdateParams,
} from '@876/admin'

export type BillingAccountDraft = {
  name: string
  email: string
  invoiceEmail: string
  currency: string
}

export function createEmptyBillingAccountDraft(): BillingAccountDraft {
  return {
    name: '',
    email: '',
    invoiceEmail: '',
    currency: 'jmd',
  }
}

export function createBillingAccountUpdateDraft(
  account: AdminBillingAccount
): BillingAccountDraft {
  return {
    name: account.name ?? '',
    email: account.email ?? '',
    invoiceEmail: account.invoice_email ?? '',
    currency: account.currency ?? 'jmd',
  }
}

export function toBillingAccountCreateParams(
  organizationId: string,
  draft: BillingAccountDraft
): AdminBillingAccountCreateParams {
  return {
    organization_id: organizationId,
    ...toBillingAccountUpdateParams(draft),
  }
}

export function toBillingAccountUpdateParams(
  draft: BillingAccountDraft
): AdminBillingAccountUpdateParams {
  return {
    name: draft.name.trim() || null,
    email: draft.email.trim() || null,
    invoice_email: draft.invoiceEmail.trim() || null,
    currency: draft.currency.trim().toLowerCase() || null,
  }
}
