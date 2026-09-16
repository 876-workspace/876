import { communicationsError } from '../http/errors.js'
import { EmailProviderError } from './email-provider.js'

export function providerErrorToAppError(error: unknown) {
  if (error instanceof EmailProviderError) {
    return communicationsError(
      error.kind === 'unavailable'
        ? 'communications/provider-unavailable'
        : 'communications/provider-rejected'
    )
  }

  return communicationsError('communications/provider-unavailable')
}
