/**
 * Twilio-owned response and request shapes kept out of provider-neutral code.
 *
 * These types model the raw Twilio API payloads. They are intentionally
 * separate from the provider-neutral contracts in the adapter so that a change
 * to a Twilio API shape does not propagate to callers outside this directory.
 */

// ---------- response shapes ----------

/** Raw Twilio Verify verification resource. */
export interface TwilioVerification {
  sid: string
  status: string
  /** Destination phone number in E.164. */
  to: string
  channel: string | null
  valid: boolean
  date_created: string | null // snake_case — wire key from Twilio
  [key: string]: unknown
}

/** Raw Twilio Lookup V2 response. */
export interface TwilioLookup {
  phone_number: string // snake_case — wire key from Twilio
  national_format: string | null // snake_case — wire key from Twilio
  country_code: string | null // snake_case — wire key from Twilio
  valid: boolean | null
  line_type_intelligence: TwilioLineTypeIntelligence | null // snake_case — wire key from Twilio
  [key: string]: unknown
}

/** Embedded line-type object inside a Lookup V2 response. */
export interface TwilioLineTypeIntelligence {
  carrier_name: string | null // snake_case — wire key from Twilio
  type: string | null
  mobile_country_code: string | null // snake_case — wire key from Twilio
  mobile_network_code: string | null // snake_case — wire key from Twilio
  [key: string]: unknown
}

/** Raw Twilio Messages API resource. */
export interface TwilioMessage {
  sid: string
  status: string
  to: string
  /** Aliased `from` in Python via Pydantic `alias`; plain `from` is a reserved word. */
  from: string | null
  [key: string]: unknown
}

/** Raw Twilio Calls API resource. */
export interface TwilioCall {
  sid: string
  status: string
  to: string
  /** Aliased `from` in Python via Pydantic `alias`; plain `from` is a reserved word. */
  from: string | null
  [key: string]: unknown
}

// ---------- safe-cast helpers ----------

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function nullableBool(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function obj(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

/**
 * Every `parse*` below spreads `raw` **first** and the narrowed fields second.
 *
 * That order is what makes the narrowing real: Pydantic's `extra="allow"` keeps
 * the *validated* field and carries unknown keys alongside it, so spreading raw
 * last would hand the caller Twilio's unvalidated value back — a numeric `sid`
 * or a missing `to` would flow straight through the `string` type into a
 * serializer, and only fail somewhere far from here.
 */
export function parseTwilioVerification(
  raw: Record<string, unknown>
): TwilioVerification {
  return {
    ...raw,
    sid: str(raw['sid']) ?? '',
    status: str(raw['status']) ?? '',
    to: str(raw['to']) ?? '',
    channel: str(raw['channel']),
    valid: bool(raw['valid'], false),
    date_created: str(raw['date_created']),
  }
}

export function parseTwilioLookup(raw: Record<string, unknown>): TwilioLookup {
  const ltiRaw = obj(raw['line_type_intelligence'])
  const lti: TwilioLineTypeIntelligence | null = ltiRaw
    ? {
        ...ltiRaw,
        carrier_name: str(ltiRaw['carrier_name']),
        type: str(ltiRaw['type']),
        mobile_country_code: str(ltiRaw['mobile_country_code']),
        mobile_network_code: str(ltiRaw['mobile_network_code']),
      }
    : null

  return {
    ...raw,
    phone_number: str(raw['phone_number']) ?? '',
    national_format: str(raw['national_format']),
    country_code: str(raw['country_code']),
    valid: nullableBool(raw['valid']),
    line_type_intelligence: lti,
  }
}

export function parseTwilioMessage(
  raw: Record<string, unknown>
): TwilioMessage {
  return {
    ...raw,
    sid: str(raw['sid']) ?? '',
    status: str(raw['status']) ?? '',
    to: str(raw['to']) ?? '',
    from: str(raw['from']),
  }
}

export function parseTwilioCall(raw: Record<string, unknown>): TwilioCall {
  return {
    ...raw,
    sid: str(raw['sid']) ?? '',
    status: str(raw['status']) ?? '',
    to: str(raw['to']) ?? '',
    from: str(raw['from']),
  }
}

// ---------- request form helpers ----------

export function verificationCreateForm(params: {
  toNumber: string
  channel: string
}): URLSearchParams {
  return new URLSearchParams({ To: params.toNumber, Channel: params.channel })
}

export function verificationCheckForm(params: {
  toNumber: string
  code: string
}): URLSearchParams {
  return new URLSearchParams({ To: params.toNumber, Code: params.code })
}

export function messageCreateForm(params: {
  toNumber: string
  messagingServiceSid: string
  body: string | null
  contentSid: string | null
  statusCallback: string | null
}): URLSearchParams {
  const form = new URLSearchParams({
    To: params.toNumber,
    MessagingServiceSid: params.messagingServiceSid,
  })
  if (params.body !== null) form.set('Body', params.body)
  if (params.contentSid !== null) form.set('ContentSid', params.contentSid)
  if (params.statusCallback !== null)
    form.set('StatusCallback', params.statusCallback)
  return form
}

export function callCreateForm(params: {
  toNumber: string
  fromNumber: string
  twimlUrl: string
  statusCallback: string | null
}): URLSearchParams {
  const form = new URLSearchParams({
    To: params.toNumber,
    From: params.fromNumber,
    Url: params.twimlUrl,
  })
  if (params.statusCallback !== null) {
    form.set('StatusCallback', params.statusCallback)
    // Twilio accepts selected progress events as a space-separated value.
    // Without this field it sends only the completed callback.
    form.set('StatusCallbackEvent', 'initiated ringing answered completed')
  }
  return form
}

// ---------- error extraction ----------

/**
 * Extract only safe error metadata from a Twilio error response.
 *
 * Returns `[providerCode, resourceSid, message]`. The message is present for
 * logging length only — it must never reach a user-facing error body.
 */
export function twilioErrorDetails(
  payload: unknown
): [string, string | null, string | null] {
  if (
    payload === null ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    return ['', null, null]
  }
  const p = payload as Record<string, unknown>
  const code = String(p['code'] ?? '')
  const resourceSid = p['more_info'] ?? p['sid']
  const message = p['message']
  return [
    code,
    typeof resourceSid === 'string' ? resourceSid : null,
    typeof message === 'string' ? message : null,
  ]
}
