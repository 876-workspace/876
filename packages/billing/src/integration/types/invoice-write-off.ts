/** Parameters for writing off an invoice through the integration API. */
export interface BillingInvoiceWriteOffParams {
  /** Required audit reason for the write-off. */
  reason: string
}
