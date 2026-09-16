export type EmailProviderName = 'resend'

export type ProviderDomainStatus =
  | 'pending'
  | 'verified'
  | 'failed'
  | 'temporary-failure'

export type ProviderDomainRecord = {
  name: string
  type: string
  value: string
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
    readonly status?: number
  ) {
    super(message)
    this.name = 'EmailProviderError'
  }
}
