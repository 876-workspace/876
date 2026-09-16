import { getSettings } from '../config/index.js'

import { EmailProviderError, type EmailProvider } from './email-provider.js'
import { ResendEmailProvider } from './resend-provider.js'

let provider: EmailProvider | null = null

export function getEmailProvider(): EmailProvider {
  if (provider) return provider

  const apiKey = getSettings().resendApiKey
  if (!apiKey)
    throw new EmailProviderError(
      'unavailable',
      'Email provider is not configured.'
    )

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
