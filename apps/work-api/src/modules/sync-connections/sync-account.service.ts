import { createHash, randomBytes } from 'node:crypto'

import { getError, isError } from '@876/core'
import type {
  LinkWorkRemoteCalendarInput,
  WorkRemoteCalendar,
  WorkSyncCalendarLink,
  WorkSyncConnectionSetupInput,
} from '@876/work'

import * as syncMappings from '../sync-mappings/index.js'
import {
  buildOauthAuthorizeUrl,
  exchangeOauthCode,
  retrieveRemoteAccount,
  type WorkOauthProvider,
} from '../../providers/sync/index.js'
import * as linkRepository from './sync-calendar-link.repository.js'
import { providerError } from './sync-provider-errors.js'
import { providerForConnection } from './sync-provider.js'
import * as credentials from './sync-credentials.js'
import * as repository from './sync-connections.repository.js'
import * as connections from './sync-connections.service.js'

const stamp = (value: Date | null) =>
  value ? Math.floor(value.getTime() / 1000) : null

function stateHash(nonce: string) {
  return createHash('sha256').update(nonce).digest('hex')
}

async function ownedConnection(
  organizationId: string,
  connectionId: string,
  userId: string
) {
  const connection = await connections.retrieve(organizationId, connectionId)
  if (!connection || isError(connection)) return connection
  if (connection.userId !== userId) return getError('work/session-forbidden')
  return connection
}

export async function setup(
  organizationId: string,
  userId: string,
  input: WorkSyncConnectionSetupInput
) {
  const created = await connections.create(organizationId, {
    userId,
    provider: input.provider,
    credentialRef: null,
    remoteAccountId: null,
    remoteAccountLabel: null,
    caldavUrl: input.provider === 'CALDAV' ? input.caldavUrl : null,
  })
  if (isError(created)) return created

  if (input.provider !== 'CALDAV')
    return connections.update(organizationId, created.id, { status: 'PAUSED' })

  const raw = await repository.retrieveById(created.id)
  if (!raw) return getError('work/sync-connection-not-found')

  try {
    await credentials.storeCaldav(raw, {
      username: input.username,
      password: input.password,
    })
    const provider = await providerForConnection({
      ...created,
      credentialRef: (await repository.retrieveById(created.id))?.credentialRef ?? null,
    })
    if (isError(provider)) {
      await repository.update(created.id, {
        status: 'ERROR',
        lastErrorCode: provider.code,
      })
      return provider
    }
    await provider.calendars()
    return connections.update(organizationId, created.id, {
      status: 'ACTIVE',
      remoteAccountLabel: input.username,
      lastErrorCode: null,
    })
  } catch (error) {
    const mapped = providerError(error) ?? getError('work/internal')
    await repository.update(created.id, {
      status: 'ERROR',
      lastErrorCode: mapped.code,
    })
    return mapped
  }
}

export async function authorize(
  organizationId: string,
  connectionId: string,
  userId: string
) {
  const connection = await ownedConnection(
    organizationId,
    connectionId,
    userId
  )
  if (!connection || isError(connection))
    return connection ?? getError('work/sync-connection-not-found')
  if (connection.provider !== 'GOOGLE' && connection.provider !== 'MICROSOFT')
    return getError('work/invalid-request')

  const nonce = randomBytes(32).toString('base64url')
  const state = `${connection.id}.${nonce}`
  const expiresAt = Math.floor(Date.now() / 1000) + 10 * 60

  try {
    const authorizeUrl = buildOauthAuthorizeUrl(connection.provider, state)
    await repository.setOauthState({
      id: connection.id,
      hash: stateHash(nonce),
      expiresAt: new Date(expiresAt * 1000),
    })
    return {
      object: 'sync_authorization' as const,
      connectionId: connection.id,
      provider: connection.provider,
      authorizeUrl,
      expiresAt,
    }
  } catch (error) {
    return providerError(error) ?? getError('work/internal')
  }
}

export async function completeOauth(input: {
  provider: WorkOauthProvider
  state: string
  code: string
}) {
  const separator = input.state.indexOf('.')
  if (separator <= 0) return getError('work/sync-oauth-invalid-state')
  const connectionId = input.state.slice(0, separator)
  const nonce = input.state.slice(separator + 1)
  if (!nonce) return getError('work/sync-oauth-invalid-state')

  const connection = await repository.retrieveById(connectionId)
  if (!connection || connection.provider !== input.provider)
    return getError('work/sync-oauth-invalid-state')

  const consumed = await repository.consumeOauthState({
    id: connection.id,
    hash: stateHash(nonce),
    now: new Date(),
  })
  if (!consumed) return getError('work/sync-oauth-invalid-state')

  try {
    const token = await exchangeOauthCode(input.provider, input.code)
    const account = await retrieveRemoteAccount(input.provider, token.accessToken)
    await credentials.storeOauth(connection, token.refreshToken)
    await repository.update(connection.id, {
      status: 'ACTIVE',
      remoteAccountId: account.id,
      remoteAccountLabel: account.label,
      lastErrorCode: null,
    })
    return {
      object: 'sync_oauth_complete' as const,
      connectionId: connection.id,
      provider: input.provider,
    }
  } catch (error) {
    const mapped = providerError(error) ?? getError('work/internal')
    await repository.update(connection.id, {
      status: 'ERROR',
      lastErrorCode: mapped.code,
    })
    return mapped
  }
}

export async function remoteCalendars(
  organizationId: string,
  connectionId: string,
  userId: string
) {
  const connection = await ownedConnection(
    organizationId,
    connectionId,
    userId
  )
  if (!connection || isError(connection))
    return connection ?? getError('work/sync-connection-not-found')

  const provider = await providerForConnection(connection)
  if (isError(provider)) return provider

  try {
    const remote = await provider.calendars()
    return remote.map(
      (calendar): WorkRemoteCalendar => ({
        object: 'remote_calendar',
        remoteId: calendar.remoteId,
        provider: provider.provider,
        name: calendar.name,
        description: calendar.description ?? null,
        timeZone: calendar.timeZone ?? null,
        color: calendar.color ?? null,
        readOnly: calendar.readOnly,
      })
    )
  } catch (error) {
    return providerError(error) ?? getError('work/internal')
  }
}

function serializeLink(
  connection: {
    id: string
    provider: 'GOOGLE' | 'MICROSOFT' | 'CALDAV'
  },
  mapping: {
    id: string
    localId: string
    remoteId: string
    syncDirection: 'BIDIRECTIONAL' | 'PULL_ONLY'
    syncWindowStart: Date | null
    syncWindowEnd: Date | null
    lastSyncedAt: Date | null
    lastErrorCode: string | null
    createdAt: Date
    updatedAt: Date
  },
  remoteCalendarName: string | null = null
): WorkSyncCalendarLink {
  return {
    object: 'sync_calendar_link',
    id: mapping.id,
    connectionId: connection.id,
    provider: connection.provider,
    calendarId: mapping.localId,
    remoteCalendarId: mapping.remoteId,
    remoteCalendarName,
    syncDirection: mapping.syncDirection,
    syncWindowStart: stamp(mapping.syncWindowStart),
    syncWindowEnd: stamp(mapping.syncWindowEnd),
    lastSyncedAt: stamp(mapping.lastSyncedAt),
    lastErrorCode: mapping.lastErrorCode,
    createdAt: stamp(mapping.createdAt)!,
    updatedAt: stamp(mapping.updatedAt)!,
  }
}

function syncProviderConnection(connection: {
  id: string
  provider: 'ICALENDAR' | 'GOOGLE' | 'MICROSOFT' | 'CALDAV'
}) {
  if (connection.provider === 'ICALENDAR') return null
  return { id: connection.id, provider: connection.provider }
}

export async function listLinks(
  organizationId: string,
  connectionId: string,
  userId: string
) {
  const connection = await ownedConnection(
    organizationId,
    connectionId,
    userId
  )
  if (!connection || isError(connection))
    return connection ?? getError('work/sync-connection-not-found')
  const syncConnection = syncProviderConnection(connection)
  if (!syncConnection) return getError('work/invalid-request')

  return (await syncMappings.listCalendarStates(connectionId)).map((mapping) =>
    serializeLink(syncConnection, mapping)
  )
}

export async function linkCalendar(
  organizationId: string,
  connectionId: string,
  userId: string,
  input: LinkWorkRemoteCalendarInput
) {
  const connection = await ownedConnection(
    organizationId,
    connectionId,
    userId
  )
  if (!connection || isError(connection))
    return connection ?? getError('work/sync-connection-not-found')
  const syncConnection = syncProviderConnection(connection)
  if (!syncConnection) return getError('work/invalid-request')

  const alreadyLinked = await syncMappings.findCalendarByRemote(
    connectionId,
    input.remoteCalendarId
  )
  if (alreadyLinked) return serializeLink(syncConnection, alreadyLinked)

  const remote = await remoteCalendars(organizationId, connectionId, userId)
  if (isError(remote)) return remote
  const selected = remote.find(
    (calendar) => calendar.remoteId === input.remoteCalendarId
  )
  if (!selected) return getError('work/sync-calendar-not-found')

  const raw = await repository.retrieveById(connection.id)
  if (!raw) return getError('work/sync-connection-not-found')

  const linked = await linkRepository.link({
    tenantId: raw.tenantId,
    connectionId: connection.id,
    userId,
    localCalendarId: input.localCalendarId,
    remoteCalendarId: selected.remoteId,
    name: selected.name,
    description: selected.description,
    timeZone: selected.timeZone ?? 'UTC',
    syncDirection: selected.readOnly ? 'PULL_ONLY' : 'BIDIRECTIONAL',
  })
  if (linked.kind === 'calendar-not-found')
    return getError('work/calendar-not-found')
  if (linked.kind === 'calendar-already-linked')
    return getError('work/sync-calendar-already-linked')

  return serializeLink(syncConnection, linked.mapping, selected.name)
}

export async function unlinkCalendar(
  organizationId: string,
  connectionId: string,
  mappingId: string,
  userId: string
) {
  const connection = await ownedConnection(
    organizationId,
    connectionId,
    userId
  )
  if (!connection || isError(connection))
    return connection ?? getError('work/sync-connection-not-found')
  const mapping = await syncMappings.retrieveState(connectionId, mappingId)
  if (
    !mapping ||
    mapping.resourceType !== 'CALENDAR' ||
    mapping.parentMappingId !== null
  )
    return getError('work/sync-mapping-not-found')

  return syncMappings.removeState(mapping.id)
}
