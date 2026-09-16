import type { EmailProvider } from './email-provider.js'
import { ResendEmailProvider } from './resend-provider.js'

let provider: EmailProvider | null = null

export function getEmailProvider(): EmailProvider {
  if (provider) return provider

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured.')

  provider = new ResendEmailProvider(apiKey)
  return provider
}

export type {
  EmailProvider,
  ProviderDomain,
  ProviderDomainRecord,
  ProviderSendInput,
  ProviderSendResult,
} from './email-provider.js'
