import { createHash, createHmac } from 'node:crypto'

import { getSettings, type Settings } from '@/config'
import { listObject, type ListObject } from '@/http/envelope'
import { AppHttpError } from '@/http/errors'
import { normalizePhoneNumber } from '@/platform/phone'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'
import type {
  MessagingProvider,
  PhoneLookupProvider,
  VoiceProvider,
} from '@/providers/communications'
import {
  channelDisabled,
  getMessagingProvider,
  getPhoneLookupProvider,
  getVoiceProvider,
  notConfigured,
} from '@/providers/twilio'

import * as repository from './communications.repository'
import type {
  CommunicationCall,
  CommunicationMessage,
  CreateCallBody,
  CreateMessageBody,
  CreatePhoneLookupBody,
  ListCommunicationsQuery,
  PhoneLookup,
} from './communications.schemas'
import {
  serializeCall,
  serializeMessage,
  serializePhoneLookup,
} from './communications.serializers'
import type { MessageRow, PhoneLookupRow } from './communications.serializers'

/**
 * Cost-controlled phone lookup and server-template-only messaging.
 *
 * Body strings and WhatsApp content SIDs are server-owned. A caller selects a
 * semantic key; it can never inject arbitrary content or a provider
 * identifier, which is what keeps this endpoint from becoming an open relay.
 */

const TEMPLATE_PREVIEW_PREFIX = 'Template: '

type MessageTemplate = { channel: string; body: string | null }

const TEMPLATES: Record<string, MessageTemplate> = {
  'sms.test': { channel: 'sms', body: '876 test notification' },
  // A WhatsApp content SID is issued per Twilio account once a template is
  // approved, so it cannot be a literal. It resolves from configuration at send
  // time; without it the template is unavailable rather than sent with a
  // placeholder Twilio would reject.
  'whatsapp.test': { channel: 'whatsapp', body: null },
}

/**
 * Deliberately separate from the message templates: a caller selects a
 * platform-owned key, and no caller-controlled content, URL, or TwiML reaches
 * Twilio.
 */
const VOICE_TEMPLATES: Record<string, string> = {
  'voice.test': '<Response><Say>876 test notification</Say></Response>',
}

export const VOICE_TEMPLATE_KEYS = Object.freeze(Object.keys(VOICE_TEMPLATES))

export function voiceTemplateTwiml(templateKey: string): string | null {
  return VOICE_TEMPLATES[templateKey] ?? null
}

function invalidTemplate(message: string): AppHttpError {
  return new AppHttpError({
    code: 'communications/invalid-template',
    message,
    httpStatus: 400,
  })
}

const notFound = (message: string) =>
  new AppHttpError({
    code: 'communications/not-found',
    message,
    httpStatus: 404,
  })

/**
 * Bind the selected server template to the TwiML URL without exposing content.
 *
 * The webhook that serves the TwiML re-computes this and refuses a mismatch, so
 * a URL cannot be edited into requesting a different template.
 */
export function voiceTemplateSignature(
  authToken: string,
  templateKey: string
): string {
  return createHmac('sha256', authToken).update(templateKey).digest('hex')
}

export function buildVoiceTwimlUrl(
  settings: Settings,
  templateKey: string
): string {
  const base = `${settings.twilio.webhookBaseUrl.replace(/\/+$/, '')}/webhooks/twilio/voice`
  const query = new URLSearchParams({
    template_key: templateKey,
    signature: voiceTemplateSignature(settings.twilio.authToken, templateKey),
  })

  return `${base}?${query.toString()}`
}

/**
 * The providers a request resolves against.
 *
 * Injectable so a test drives the fake provider without reaching the network,
 * matching the constructor arguments the Python service takes.
 */
export type CommunicationsDeps = {
  settings?: Settings
  lookupProvider?: PhoneLookupProvider
  messagingProvider?: MessagingProvider
  voiceProvider?: VoiceProvider
}

function resolve(deps: CommunicationsDeps) {
  const settings = deps.settings ?? getSettings()

  return {
    settings,
    lookup: deps.lookupProvider ?? getPhoneLookupProvider(settings),
    messaging: deps.messagingProvider ?? getMessagingProvider(settings),
    voice: deps.voiceProvider ?? getVoiceProvider(settings),
  }
}

/**
 * Attribution decides the idempotency scope, most specific first.
 *
 * A literal `'platform'` rather than a null: the column is part of a unique
 * index, and Postgres treats each NULL as distinct, so a null scope would give
 * an unattributed send no idempotency at all.
 */
function idempotencyScopeOf(body: {
  appId: string | null
  organizationId: string | null
  userId: string | null
}): string {
  return body.appId ?? body.organizationId ?? body.userId ?? 'platform'
}

/* -------------------------------- lookups -------------------------------- */

/**
 * Return a cached lookup when one is fresh enough, otherwise fetch and store.
 *
 * Lookup is billed per request, so this cache is a cost control rather than an
 * optimization — every path that resolves a number must come through here, or
 * the platform pays again for a number it already knows.
 *
 * `includeLineType` only reaches the provider when the paid package is also
 * enabled in settings; the caller asking for it is never sufficient on its own.
 * A cached row without line-type data does not satisfy a request that needs it.
 */
export async function createPhoneLookup(
  body: CreatePhoneLookupBody,
  deps: CommunicationsDeps = {}
): Promise<PhoneLookup> {
  const { settings, lookup } = resolve(deps)
  const number = normalizePhoneNumber(body.number)
  const requested =
    body.includeLineType && settings.twilio.lookupLineTypeEnabled

  const cached = await repository.findLookup(number)
  const now = nowUnixSeconds()

  if (
    cached &&
    Number(cached.createdAt) >= now - settings.twilio.lookupCacheTtlSeconds &&
    (!requested || cached.lineTypeRequested)
  )
    return serializePhoneLookup(cached)

  if (!settings.twilio.lookupEnabled) throw notConfigured()

  const result = await lookup.createLookup({
    number,
    includeLineType: requested,
  })

  const saved: PhoneLookupRow = await repository.saveLookup({
    number,
    valid: Boolean(result.valid),
    e164: result.number,
    nationalFormat: result.nationalFormat,
    countryCode: result.countryCode,
    carrierName: result.carrierName,
    lineType: result.lineType,
    mobileCountryCode: result.mobileCountryCode,
    mobileNetworkCode: result.mobileNetworkCode,
    lineTypeRequested: requested,
    createdAt: BigInt(now),
  })

  return serializePhoneLookup(saved)
}

/* -------------------------------- messages ------------------------------- */

export async function createMessage(
  body: CreateMessageBody,
  deps: CommunicationsDeps = {}
): Promise<CommunicationMessage> {
  const { settings, messaging } = resolve(deps)

  const template = TEMPLATES[body.templateKey]
  if (!template || template.channel !== body.channel)
    throw invalidTemplate('The requested message template is unavailable.')

  const scope = idempotencyScopeOf(body)
  const existing = await repository.findMessageByIdempotency(
    scope,
    body.idempotencyKey
  )
  if (existing) return serializeMessage(existing)

  const channelEnabled =
    body.channel === 'sms'
      ? settings.twilio.smsEnabled
      : settings.twilio.whatsappEnabled
  if (!channelEnabled) throw channelDisabled(body.channel)

  const number = normalizePhoneNumber(body.toNumber)

  let contentSid: string | null = null
  if (body.channel === 'whatsapp') {
    contentSid = settings.twilio.whatsappContentSid || null
    if (!contentSid)
      throw invalidTemplate('The requested message template is unavailable.')
  }

  const bodyHash = createHash('sha256')
    .update(template.body ?? contentSid ?? '')
    .digest('hex')
  const now = nowUnixSeconds()

  // The intent row is written before the provider is called, and Prisma commits
  // each statement on its own. That ordering is the point: if the send times out
  // uncertainly, the row and its idempotency key survive, so the retry returns
  // the existing message instead of billing a second one. (The FastAPI service
  // needed an explicit commit here because its request-scoped transaction would
  // otherwise roll the row back together with the failure.)
  const row = await repository.createMessage({
    id: generateId('message'),
    provider: 'twilio',
    providerSid: null,
    channel: body.channel,
    direction: 'outbound',
    status: 'queued',
    toNumber: number,
    fromNumber: null,
    messagingServiceSid: settings.twilio.messagingServiceSid || null,
    contentSid,
    // A template label supports operational debugging without retaining
    // customer-facing message content, even when a template is short.
    bodyPreview: `${TEMPLATE_PREVIEW_PREFIX}${body.templateKey}`,
    bodyHash,
    userId: body.userId,
    organizationId: body.organizationId,
    appId: body.appId,
    clientReference: body.clientReference,
    idempotencyScope: scope,
    idempotencyKey: body.idempotencyKey,
    providerErrorCode: null,
    sentAt: null,
    deliveredAt: null,
    readAt: null,
    failedAt: null,
    createdAt: BigInt(now),
    updatedAt: BigInt(now),
  })

  const statusCallback = settings.twilio.webhookBaseUrl
    ? `${settings.twilio.webhookBaseUrl.replace(/\/+$/, '')}/webhooks/twilio/messages/status`
    : null

  let result
  try {
    result = await messaging.createMessage({
      toNumber: number,
      body: template.body,
      channel: body.channel,
      contentSid,
      statusCallback,
    })
  } catch (error) {
    await repository.updateMessage(row.id, {
      status: 'failed',
      failedAt: BigInt(now),
      updatedAt: BigInt(now),
    })
    throw error
  }

  const sent: MessageRow = await repository.updateMessage(row.id, {
    provider: result.provider,
    providerSid: result.providerSid,
    status: result.status,
    fromNumber: result.fromNumber,
    sentAt: ['sent', 'queued', 'accepted'].includes(result.status)
      ? BigInt(now)
      : null,
    updatedAt: BigInt(now),
  })

  return serializeMessage(sent)
}

export async function retrieveMessage(
  messageId: string
): Promise<CommunicationMessage> {
  const row = await repository.findMessage(messageId)
  if (!row) throw notFound('The message was not found.')

  return serializeMessage(row)
}

export async function listMessages(
  query: ListCommunicationsQuery
): Promise<ListObject<CommunicationMessage>> {
  const [{ data, hasMore }, totalCount] = await Promise.all([
    repository.listMessages(query, query.status),
    repository.countMessages(query.status),
  ])

  return listObject({
    data: data.map(serializeMessage),
    hasMore,
    url: '/communications/messages',
    totalCount,
  })
}

/* --------------------------------- calls --------------------------------- */

export async function createCall(
  body: CreateCallBody,
  deps: CommunicationsDeps = {}
): Promise<CommunicationCall> {
  const { settings, voice } = resolve(deps)

  if (!(body.templateKey in VOICE_TEMPLATES))
    throw invalidTemplate('The requested voice template is unavailable.')

  const scope = idempotencyScopeOf(body)
  const existing = await repository.findCallByIdempotency(
    scope,
    body.idempotencyKey
  )
  if (existing) return serializeCall(existing)

  if (!settings.twilio.voiceEnabled) throw channelDisabled('voice')

  // Outbound voice needs a publicly reachable TwiML URL and the auth token that
  // signs it. Without both, the call would either fail at Twilio or be placed
  // against an unsigned URL anyone could forge.
  if (!settings.twilio.webhookBaseUrl || !settings.twilio.authToken)
    throw new AppHttpError({
      code: 'communications/not-configured',
      message:
        'Outbound voice requires the public Twilio webhook configuration.',
      httpStatus: 503,
    })

  const number = normalizePhoneNumber(body.toNumber)
  const now = nowUnixSeconds()

  // Same durability rule as createMessage: the intent must outlive a failed
  // send, or the retry after an uncertain timeout places a second real call.
  const row = await repository.createCall({
    id: generateId('call'),
    provider: 'twilio',
    providerSid: null,
    direction: 'outbound',
    status: 'queued',
    toNumber: number,
    fromNumber: null,
    templateKey: body.templateKey,
    userId: body.userId,
    organizationId: body.organizationId,
    appId: body.appId,
    clientReference: body.clientReference,
    idempotencyScope: scope,
    idempotencyKey: body.idempotencyKey,
    durationSeconds: null,
    providerErrorCode: null,
    startedAt: null,
    answeredAt: null,
    completedAt: null,
    createdAt: BigInt(now),
    updatedAt: BigInt(now),
  })

  let result
  try {
    result = await voice.createCall({
      toNumber: number,
      twimlUrl: buildVoiceTwimlUrl(settings, body.templateKey),
      statusCallback: `${settings.twilio.webhookBaseUrl.replace(/\/+$/, '')}/webhooks/twilio/calls/status`,
    })
  } catch (error) {
    await repository.updateCall(row.id, {
      status: 'failed',
      completedAt: BigInt(now),
      updatedAt: BigInt(now),
    })
    throw error
  }

  const placed = await repository.updateCall(row.id, {
    provider: result.provider,
    providerSid: result.providerSid,
    status: result.status,
    fromNumber: result.fromNumber,
    startedAt: ['initiated', 'ringing', 'in-progress'].includes(result.status)
      ? BigInt(now)
      : null,
    updatedAt: BigInt(now),
  })

  return serializeCall(placed)
}

export async function retrieveCall(callId: string): Promise<CommunicationCall> {
  const row = await repository.findCall(callId)
  if (!row) throw notFound('The call was not found.')

  return serializeCall(row)
}

export async function listCalls(
  query: ListCommunicationsQuery
): Promise<ListObject<CommunicationCall>> {
  const [{ data, hasMore }, totalCount] = await Promise.all([
    repository.listCalls(query, query.status),
    repository.countCalls(query.status),
  ])

  return listObject({
    data: data.map(serializeCall),
    hasMore,
    url: '/communications/calls',
    totalCount,
  })
}
