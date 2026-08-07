/**
 * Twilio adapter: converts provider payloads to provider-neutral contracts.
 *
 * Each class takes a {@link TwilioClient} and fulfils one of the protocol
 * shapes defined in the communications contracts. The split keeps the adapter
 * layer thin and testable: swap the client with a fake and the adapter logic
 * is fully exercised without network access.
 */

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
import { TwilioClient } from './client'
import {
  type TwilioCall,
  type TwilioLookup,
  type TwilioMessage,
  type TwilioVerification,
} from './types'

// ---------- private helpers ----------

function toVerification(raw: TwilioVerification): PhoneVerification {
  return {
    ...EMPTY_VERIFICATION_FIELDS,
    provider: 'twilio',
    providerSid: raw.sid,
    status: raw.status,
    toNumber: raw.to,
    channel: raw.channel ?? '',
    valid: raw.valid,
  }
}

function toLookup(raw: TwilioLookup): PhoneLookup {
  const intel = raw.line_type_intelligence
  return {
    provider: 'twilio',
    number: raw.phone_number,
    nationalFormat: raw.national_format,
    countryCode: raw.country_code,
    valid: raw.valid,
    carrierName: intel ? intel.carrier_name : null,
    lineType: intel ? intel.type : null,
    mobileCountryCode: intel ? intel.mobile_country_code : null,
    mobileNetworkCode: intel ? intel.mobile_network_code : null,
  }
}

function toMessage(raw: TwilioMessage): ProviderMessage {
  return {
    provider: 'twilio',
    providerSid: raw.sid,
    status: raw.status,
    toNumber: raw.to,
    fromNumber: raw.from,
  }
}

function toCall(raw: TwilioCall): ProviderCall {
  return {
    provider: 'twilio',
    providerSid: raw.sid,
    status: raw.status,
    toNumber: raw.to,
    fromNumber: raw.from,
  }
}

// ---------- adapters ----------

/**
 * Twilio Verify implementation of the provider-neutral verification contract.
 */
export class TwilioPhoneVerificationProvider implements PhoneVerificationProvider {
  constructor(
    private readonly client: TwilioClient,
    private readonly verifyServiceSid: string
  ) {}

  async createVerification(params: {
    toNumber: string
    channel: string
  }): Promise<PhoneVerification> {
    const raw = await this.client.createVerification({
      serviceSid: this.verifyServiceSid,
      toNumber: params.toNumber,
      channel: params.channel,
    })
    return toVerification(raw)
  }

  async approveVerification(params: {
    toNumber: string
    code: string
  }): Promise<PhoneVerification> {
    const raw = await this.client.approveVerification({
      serviceSid: this.verifyServiceSid,
      toNumber: params.toNumber,
      code: params.code,
    })
    return toVerification(raw)
  }
}

/**
 * Twilio Lookup V2 implementation of the provider-neutral lookup contract.
 */
export class TwilioPhoneLookupProvider implements PhoneLookupProvider {
  constructor(private readonly client: TwilioClient) {}

  async createLookup(params: {
    number: string
    includeLineType?: boolean
  }): Promise<PhoneLookup> {
    const raw = await this.client.createLookup({
      number: params.number,
      includeLineType: params.includeLineType ?? false,
    })
    return toLookup(raw)
  }
}

/**
 * Twilio Messages API implementation of the provider-neutral messaging contract.
 */
export class TwilioMessagingProvider implements MessagingProvider {
  constructor(
    private readonly client: TwilioClient,
    private readonly accountSid: string,
    private readonly messagingServiceSid: string
  ) {}

  async createMessage(params: {
    toNumber: string
    body: string | null
    channel: string
    contentSid?: string | null
    statusCallback?: string | null
  }): Promise<ProviderMessage> {
    const raw = await this.client.createMessage({
      accountSid: this.accountSid,
      messagingServiceSid: this.messagingServiceSid,
      // Prefix WhatsApp numbers with the Twilio sandbox prefix.
      toNumber:
        params.channel === 'whatsapp'
          ? `whatsapp:${params.toNumber}`
          : params.toNumber,
      body: params.body,
      contentSid: params.contentSid ?? null,
      statusCallback: params.statusCallback ?? null,
    })
    return toMessage(raw)
  }

  retrieveMessage(): Promise<ProviderMessage> {
    throw new Error(
      'Message retrieval is not required for outbound status tracking.'
    )
  }
}

/**
 * Twilio Calls API implementation of the provider-neutral voice contract.
 */
export class TwilioVoiceProvider implements VoiceProvider {
  constructor(
    private readonly client: TwilioClient,
    private readonly accountSid: string,
    private readonly fromNumber: string
  ) {}

  async createCall(params: {
    toNumber: string
    twimlUrl: string
    statusCallback?: string | null
  }): Promise<ProviderCall> {
    const raw = await this.client.createCall({
      accountSid: this.accountSid,
      toNumber: params.toNumber,
      fromNumber: this.fromNumber,
      twimlUrl: params.twimlUrl,
      statusCallback: params.statusCallback ?? null,
    })
    return toCall(raw)
  }

  retrieveCall(): Promise<ProviderCall> {
    throw new Error(
      'Call retrieval is not required for outbound status tracking.'
    )
  }
}
