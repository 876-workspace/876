/**
 * Small async REST client for the Twilio Verify, Lookup, Messages, and Calls APIs.
 *
 * Uses the global `fetch` with `AbortSignal.timeout` — no axios, no node-fetch,
 * no Twilio SDK. One client instance per credential pair is the intended usage;
 * see the factory in `index.ts`.
 *
 * No credentials are ever logged. Phone numbers are masked to the last four
 * digits before they appear in log fields.
 */

import { getLogger } from '@/platform/logger'

import {
  maskPhoneNumber,
  normalizeTwilioError,
  providerUnavailable,
} from './errors'
import {
  callCreateForm,
  messageCreateForm,
  parseTwilioCall,
  parseTwilioLookup,
  parseTwilioMessage,
  parseTwilioVerification,
  type TwilioCall,
  type TwilioLookup,
  type TwilioMessage,
  type TwilioVerification,
  verificationCheckForm,
  verificationCreateForm,
} from './types'

const log = getLogger('twilio.client')

/** Timeout for every Twilio REST call, matching the Python httpx default. */
const TIMEOUT_MS = 15_000

export interface TwilioClientOptions {
  readonly apiKey: string
  readonly apiKeySecret: string
  readonly verifyBaseUrl?: string
  readonly lookupBaseUrl?: string
}

/**
 * Low-level Twilio REST client.
 *
 * Construct via the shared-client factory in `index.ts` — never per request —
 * so that one connection pool is shared for the life of the process.
 */
export class TwilioClient {
  private readonly verifyBaseUrl: string
  private readonly lookupBaseUrl: string
  private readonly authHeader: string

  constructor(opts: TwilioClientOptions) {
    this.verifyBaseUrl = (
      opts.verifyBaseUrl ?? 'https://verify.twilio.com'
    ).replace(/\/$/, '')
    this.lookupBaseUrl = (
      opts.lookupBaseUrl ?? 'https://lookups.twilio.com'
    ).replace(/\/$/, '')
    // Basic auth: "apiKey:apiKeySecret" base64-encoded.
    this.authHeader = `Basic ${Buffer.from(`${opts.apiKey}:${opts.apiKeySecret}`).toString('base64')}`
  }

  private async request(
    method: string,
    url: string,
    opts: { body?: URLSearchParams; toNumber?: string } = {}
  ): Promise<Record<string, unknown>> {
    // Masked, never raw: the last four digits are enough to correlate a support
    // report with a log line, and are not a reversible identifier on their own.
    const context: Record<string, unknown> = {
      to: maskPhoneNumber(opts.toNumber),
    }
    const started = performance.now()

    let response: Response
    try {
      response = await fetch(url, {
        method,
        headers: {
          Authorization: this.authHeader,
          ...(opts.body
            ? { 'Content-Type': 'application/x-www-form-urlencoded' }
            : {}),
        },
        body: opts.body ? opts.body.toString() : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch (err) {
      log.warn(
        {
          method,
          latency_ms: performance.now() - started,
          ...context,
        },
        'twilio.request_error'
      )
      throw providerUnavailable(err, { context })
    }

    if (!response.ok) {
      const latencyMs = performance.now() - started
      log.warn(
        {
          method,
          status: response.status,
          latency_ms: latencyMs,
          ...context,
        },
        'twilio.request_failed'
      )
      let body: unknown
      try {
        body = await response.json()
      } catch {
        body = {}
      }
      throw normalizeTwilioError({ status: response.status, body }, { context })
    }

    try {
      const json: unknown = await response.json()
      if (json === null || typeof json !== 'object' || Array.isArray(json))
        return {}
      return json as Record<string, unknown>
    } catch {
      return {}
    }
  }

  async createVerification(params: {
    serviceSid: string
    toNumber: string
    channel: string
  }): Promise<TwilioVerification> {
    const raw = await this.request(
      'POST',
      `${this.verifyBaseUrl}/v2/Services/${params.serviceSid}/Verifications`,
      {
        body: verificationCreateForm({
          toNumber: params.toNumber,
          channel: params.channel,
        }),
        toNumber: params.toNumber,
      }
    )
    return parseTwilioVerification(raw)
  }

  async approveVerification(params: {
    serviceSid: string
    toNumber: string
    code: string
  }): Promise<TwilioVerification> {
    const raw = await this.request(
      'POST',
      `${this.verifyBaseUrl}/v2/Services/${params.serviceSid}/VerificationCheck`,
      {
        body: verificationCheckForm({
          toNumber: params.toNumber,
          code: params.code,
        }),
        toNumber: params.toNumber,
      }
    )
    return parseTwilioVerification(raw)
  }

  async createLookup(params: {
    number: string
    includeLineType?: boolean
  }): Promise<TwilioLookup> {
    let url = `${this.lookupBaseUrl}/v2/PhoneNumbers/${encodeURIComponent(params.number)}`
    if (params.includeLineType) url += '?Fields=line_type_intelligence'
    const raw = await this.request('GET', url, { toNumber: params.number })
    return parseTwilioLookup(raw)
  }

  async createMessage(params: {
    accountSid: string
    messagingServiceSid: string
    toNumber: string
    body: string | null
    contentSid: string | null
    statusCallback: string | null
  }): Promise<TwilioMessage> {
    const raw = await this.request(
      'POST',
      `https://api.twilio.com/2010-04-01/Accounts/${params.accountSid}/Messages.json`,
      {
        body: messageCreateForm({
          toNumber: params.toNumber,
          messagingServiceSid: params.messagingServiceSid,
          body: params.body,
          contentSid: params.contentSid,
          statusCallback: params.statusCallback,
        }),
        toNumber: params.toNumber,
      }
    )
    return parseTwilioMessage(raw)
  }

  async createCall(params: {
    accountSid: string
    toNumber: string
    fromNumber: string
    twimlUrl: string
    statusCallback: string | null
  }): Promise<TwilioCall> {
    const raw = await this.request(
      'POST',
      `https://api.twilio.com/2010-04-01/Accounts/${params.accountSid}/Calls.json`,
      {
        body: callCreateForm({
          toNumber: params.toNumber,
          fromNumber: params.fromNumber,
          twimlUrl: params.twimlUrl,
          statusCallback: params.statusCallback,
        }),
        toNumber: params.toNumber,
      }
    )
    return parseTwilioCall(raw)
  }
}
