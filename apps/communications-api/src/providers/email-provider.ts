export type EmailProviderName = 'resend'

export type ProviderDomainStatus =
  | 'not-started'
  | 'pending'
  | 'partially-verified'
  | 'partially-failed'
  | 'verified'
  | 'failed'

export type ProviderDomainRecord = {
  name: string
  type: string
  value: string
  /**
   * What the record is *for* (SPF, DKIM, tracking), as distinct from `type`,
   * which is only the DNS record kind. Without it a setup screen can only print
   * undifferentiated rows — several records share the same name or type.
   */
  purpose?: string
  status?: string
  ttl?: string
  priority?: number
}

export type ProviderDomain = {
  providerDomainId: string
  name: string
  region: string | null
  status: ProviderDomainStatus
  records: ProviderDomainRecord[]
}

export type CreateProviderDomainInput = {
  name: string
  region?: string
}

export type ProviderSendInput = {
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  replyTo?: string
  subject: string
  html: string
  text?: string
  idempotencyKey: string
  tags?: Array<{ name: string; value: string }>
}

export type ProviderSendResult = {
  providerMessageId: string
}

export interface EmailProvider {
  readonly name: EmailProviderName

  createDomain(input: CreateProviderDomainInput): Promise<ProviderDomain>
  retrieveDomain(providerDomainId: string): Promise<ProviderDomain>
  verifyDomain(providerDomainId: string): Promise<void>
  deleteDomain(providerDomainId: string): Promise<void>
  send(input: ProviderSendInput): Promise<ProviderSendResult>
}

export class EmailProviderError extends Error {
  constructor(
    readonly kind: 'unavailable' | 'rejected' | 'invalid-response',
    message: string,
    readonly status?: number,
    /**
     * The provider's own machine-readable error code, preserved so callers can
     * tell a misconfigured credential from an unverified domain from an
     * exhausted quota. These have different remedies and the status code alone
     * does not distinguish them.
     */
    readonly providerCode?: string,
    /**
     * Whether retrying the identical request could succeed. A rate limit is
     * retryable; an exhausted daily quota shares its status code and is not.
     */
    readonly retryable: boolean = false
  ) {
    super(message)
    this.name = 'EmailProviderError'
  }
}
