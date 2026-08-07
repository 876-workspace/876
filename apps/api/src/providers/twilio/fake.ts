/**
 * Deterministic, in-process communications provider for local development and tests.
 *
 * No network calls are made. The magic code `000000` is the only code that
 * approves a fake verification — everything else returns `pending`.
 */

import { createHash } from 'node:crypto'

import {
  EMPTY_VERIFICATION_FIELDS,
  type MessagingProvider,
  type PhoneLookup,
  type PhoneLookupProvider,
  type PhoneVerification,
  type PhoneVerificationProvider,
  type ProviderCall,
  type ProviderMessage,
  type VoiceProvider,
} from '../communications'

export class FakeTwilioProvider
  implements
    PhoneVerificationProvider,
    PhoneLookupProvider,
    MessagingProvider,
    VoiceProvider
{
  async createVerification(params: {
    toNumber: string
    channel: string
  }): Promise<PhoneVerification> {
    return {
      ...EMPTY_VERIFICATION_FIELDS,
      provider: 'fake',
      providerSid: this.sid('verify', params.toNumber, params.channel),
      status: 'pending',
      toNumber: params.toNumber,
      channel: params.channel,
    }
  }

  async approveVerification(params: {
    toNumber: string
    code: string
  }): Promise<PhoneVerification> {
    const approved = params.code === '000000'
    return {
      ...EMPTY_VERIFICATION_FIELDS,
      provider: 'fake',
      providerSid: this.sid('check', params.toNumber),
      status: approved ? 'approved' : 'pending',
      toNumber: params.toNumber,
      channel: '',
      valid: approved,
    }
  }

  async createLookup(params: {
    number: string
    includeLineType?: boolean
  }): Promise<PhoneLookup> {
    return {
      provider: 'fake',
      number: params.number,
      nationalFormat: null,
      countryCode: null,
      valid: true,
      carrierName: null,
      lineType: null,
      mobileCountryCode: null,
      mobileNetworkCode: null,
    }
  }

  async createMessage(params: {
    toNumber: string
    body: string | null
    channel: string
    contentSid?: string | null
    statusCallback?: string | null
  }): Promise<ProviderMessage> {
    return {
      provider: 'fake',
      providerSid: this.sid('message', params.toNumber, params.channel),
      status: 'queued',
      toNumber: params.toNumber,
      fromNumber: null,
    }
  }

  async retrieveMessage(params: {
    providerSid: string
  }): Promise<ProviderMessage> {
    return {
      provider: 'fake',
      providerSid: params.providerSid,
      status: 'queued',
      toNumber: '',
      fromNumber: null,
    }
  }

  async createCall(params: {
    toNumber: string
    twimlUrl: string
    statusCallback?: string | null
  }): Promise<ProviderCall> {
    return {
      provider: 'fake',
      providerSid: this.sid('call', params.toNumber),
      status: 'queued',
      toNumber: params.toNumber,
      fromNumber: null,
    }
  }

  async retrieveCall(params: { providerSid: string }): Promise<ProviderCall> {
    return {
      provider: 'fake',
      providerSid: params.providerSid,
      status: 'queued',
      toNumber: '',
      fromNumber: null,
    }
  }

  private sid(...parts: string[]): string {
    return (
      'fake_' +
      createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 24)
    )
  }
}
