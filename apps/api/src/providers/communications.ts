/**
 * Provider-neutral contracts for communications capabilities.
 *
 * Concrete providers throw {@link AppHttpError} for hard failures. Callers must
 * never infer verification success from transport success; only a
 * {@link PhoneVerification} whose `status` is `approved` may verify a number.
 *
 * These interfaces are what a module depends on — never a vendor type. Swapping
 * Twilio for another vendor is meant to be a change under `providers/`, not a
 * change to every caller.
 */

/** Provider result for a phone verification create or approval operation. */
export interface PhoneVerification {
  readonly provider: string
  readonly providerSid: string
  readonly status: string
  readonly toNumber: string
  readonly channel: string
  readonly valid: boolean
  readonly expiresAt: number | null
  readonly metadata: Record<string, unknown>
}

/** Provider result for an E.164 number lookup. */
export interface PhoneLookup {
  readonly provider: string
  /** The E.164 number the lookup was performed against. */
  readonly number: string
  readonly nationalFormat: string | null
  readonly countryCode: string | null
  readonly valid: boolean | null
  readonly carrierName: string | null
  readonly lineType: string | null
  readonly mobileCountryCode: string | null
  readonly mobileNetworkCode: string | null
}

/** Provider-normalized message state. */
export interface ProviderMessage {
  readonly provider: string
  readonly providerSid: string
  readonly status: string
  readonly toNumber: string
  readonly fromNumber: string | null
}

/** Provider-normalized voice-call state. */
export interface ProviderCall {
  readonly provider: string
  readonly providerSid: string
  readonly status: string
  readonly toNumber: string
  readonly fromNumber: string | null
}

export interface PhoneVerificationProvider {
  createVerification(params: {
    toNumber: string
    channel: string
  }): Promise<PhoneVerification>

  approveVerification(params: {
    toNumber: string
    code: string
  }): Promise<PhoneVerification>
}

export interface PhoneLookupProvider {
  createLookup(params: {
    number: string
    includeLineType?: boolean
  }): Promise<PhoneLookup>
}

export interface MessagingProvider {
  createMessage(params: {
    toNumber: string
    body: string | null
    channel: string
    contentSid?: string | null
    statusCallback?: string | null
  }): Promise<ProviderMessage>

  retrieveMessage(params: { providerSid: string }): Promise<ProviderMessage>
}

export interface VoiceProvider {
  createCall(params: {
    toNumber: string
    twimlUrl: string
    statusCallback?: string | null
  }): Promise<ProviderCall>

  retrieveCall(params: { providerSid: string }): Promise<ProviderCall>
}

/** Verifies a provider-signed webhook without parsing provider payloads. */
export interface CommunicationsWebhookVerifier {
  validate(params: {
    path: string
    params: Record<string, string>
    signature: string
  }): boolean
}

/** Defaults for the optional fields, so a provider states only what it knows. */
export const EMPTY_VERIFICATION_FIELDS = {
  valid: false,
  expiresAt: null,
  metadata: {},
} as const satisfies Pick<PhoneVerification, 'valid' | 'expiresAt' | 'metadata'>
