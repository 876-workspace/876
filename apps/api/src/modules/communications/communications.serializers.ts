/** Row → API resource for phone lookups, messages, and calls. */

import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '@/platform/timestamps'

import type {
  CommunicationCall,
  CommunicationMessage,
  PhoneLookup,
} from './communications.schemas'

const TEMPLATE_PREVIEW_PREFIX = 'Template: '

export type PhoneLookupRow = {
  number: string
  valid: boolean
  e164: string | null
  nationalFormat: string | null
  countryCode: string | null
  carrierName: string | null
  lineType: string | null
  mobileCountryCode: string | null
  mobileNetworkCode: string | null
  lineTypeRequested: boolean
  createdAt: bigint
}

export type MessageRow = {
  id: string
  provider: string
  providerSid: string | null
  channel: string
  direction: string
  status: string
  toNumber: string
  fromNumber: string | null
  messagingServiceSid: string | null
  contentSid: string | null
  bodyPreview: string | null
  bodyHash: string
  userId: string | null
  organizationId: string | null
  appId: string | null
  clientReference: string | null
  idempotencyKey: string
  providerErrorCode: string | null
  sentAt: bigint | null
  deliveredAt: bigint | null
  readAt: bigint | null
  failedAt: bigint | null
  createdAt: bigint
  updatedAt: bigint
}

export type CallRow = {
  id: string
  provider: string
  providerSid: string | null
  direction: string
  status: string
  toNumber: string
  fromNumber: string | null
  templateKey: string
  userId: string | null
  organizationId: string | null
  appId: string | null
  clientReference: string | null
  idempotencyKey: string
  durationSeconds: number | null
  providerErrorCode: string | null
  startedAt: bigint | null
  answeredAt: bigint | null
  completedAt: bigint | null
  createdAt: bigint
  updatedAt: bigint
}

export function serializePhoneLookup(row: PhoneLookupRow): PhoneLookup {
  return {
    object: 'phone_lookup',
    valid: row.valid,
    e164: row.e164,
    national_format: row.nationalFormat,
    country_code: row.countryCode,
    carrier_name: row.carrierName,
    line_type: row.lineType,
    mobile_country_code: row.mobileCountryCode,
    mobile_network_code: row.mobileNetworkCode,
    line_type_requested: row.lineTypeRequested,
    created_at: fromDbUnixSeconds(row.createdAt),
  }
}

/**
 * A message has no `template_key` column.
 *
 * The key is recovered from the `body_preview` label the send wrote, which is
 * how the resource exposes which server template was used without retaining
 * the customer-facing text. A preview that is not a template label — there is
 * none today, but the column is nullable and writable — yields null rather
 * than a misleading key.
 */
function templateKeyOf(bodyPreview: string | null): string | null {
  return bodyPreview?.startsWith(TEMPLATE_PREVIEW_PREFIX)
    ? bodyPreview.slice(TEMPLATE_PREVIEW_PREFIX.length)
    : null
}

export function serializeMessage(row: MessageRow): CommunicationMessage {
  return {
    object: 'communication_message',
    id: row.id,
    provider: row.provider,
    provider_sid: row.providerSid,
    channel: row.channel,
    direction: row.direction,
    status: row.status,
    to_number: row.toNumber,
    from_number: row.fromNumber,
    messaging_service_sid: row.messagingServiceSid,
    content_sid: row.contentSid,
    template_key: templateKeyOf(row.bodyPreview),
    body_preview: row.bodyPreview,
    body_hash: row.bodyHash,
    user_id: row.userId,
    organization_id: row.organizationId,
    app_id: row.appId,
    client_reference: row.clientReference,
    idempotency_key: row.idempotencyKey,
    provider_error_code: row.providerErrorCode,
    sent_at: nullableFromDbUnixSeconds(row.sentAt),
    delivered_at: nullableFromDbUnixSeconds(row.deliveredAt),
    read_at: nullableFromDbUnixSeconds(row.readAt),
    failed_at: nullableFromDbUnixSeconds(row.failedAt),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeCall(row: CallRow): CommunicationCall {
  return {
    object: 'communication_call',
    id: row.id,
    provider: row.provider,
    provider_sid: row.providerSid,
    direction: row.direction,
    status: row.status,
    to_number: row.toNumber,
    from_number: row.fromNumber,
    template_key: row.templateKey,
    user_id: row.userId,
    organization_id: row.organizationId,
    app_id: row.appId,
    client_reference: row.clientReference,
    idempotency_key: row.idempotencyKey,
    duration_seconds: row.durationSeconds,
    provider_error_code: row.providerErrorCode,
    started_at: nullableFromDbUnixSeconds(row.startedAt),
    answered_at: nullableFromDbUnixSeconds(row.answeredAt),
    completed_at: nullableFromDbUnixSeconds(row.completedAt),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}
