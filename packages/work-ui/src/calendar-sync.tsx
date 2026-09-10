import type {
  WorkExternalSyncProvider,
  WorkRemoteCalendar,
  WorkSyncCalendarLink,
  WorkSyncConnectionSummary,
} from '@876/work'
import type { FormEvent } from 'react'

import { cn } from '@876/core/utils'

type OAuthProvider = Extract<WorkExternalSyncProvider, 'GOOGLE' | 'MICROSOFT'>

export type WorkCalendarSyncCaldavDraft = {
  caldavUrl: string
  username: string
  password: string
}

export type WorkCalendarSyncManagerProps = {
  connections: readonly WorkSyncConnectionSummary[]
  activeConnectionId: string | null
  remoteCalendars: readonly WorkRemoteCalendar[]
  calendarLinks: readonly WorkSyncCalendarLink[]
  pending?: boolean
  loadingRemoteCalendars?: boolean
  canManage?: boolean
  onSelectConnection: (connectionId: string | null) => void
  onConnectOAuth?: (
    provider: OAuthProvider
  ) => boolean | void | Promise<boolean | void>
  onConnectCaldav?: (
    input: WorkCalendarSyncCaldavDraft
  ) => boolean | void | Promise<boolean | void>
  onAuthorize?: (
    connection: WorkSyncConnectionSummary
  ) => void | Promise<void>
  onLinkCalendar?: (
    connection: WorkSyncConnectionSummary,
    remoteCalendar: WorkRemoteCalendar
  ) => void | Promise<void>
  onUnlinkCalendar?: (link: WorkSyncCalendarLink) => void | Promise<void>
  onSyncConnection?: (
    connection: WorkSyncConnectionSummary
  ) => void | Promise<void>
  onSyncCalendar?: (link: WorkSyncCalendarLink) => void | Promise<void>
  onDisconnect?: (
    connection: WorkSyncConnectionSummary
  ) => void | Promise<void>
  className?: string
}

function providerLabel(provider: WorkExternalSyncProvider) {
  if (provider === 'GOOGLE') return 'Google Calendar'
  if (provider === 'MICROSOFT') return 'Microsoft Calendar'
  return 'CalDAV'
}

export function WorkCalendarSyncManager({
  connections,
  activeConnectionId,
  remoteCalendars,
  calendarLinks,
  pending = false,
  loadingRemoteCalendars = false,
  canManage = false,
  onSelectConnection,
  onConnectOAuth,
  onConnectCaldav,
  onAuthorize,
  onLinkCalendar,
  onUnlinkCalendar,
  onSyncConnection,
  onSyncCalendar,
  onDisconnect,
  className,
}: WorkCalendarSyncManagerProps) {
  const activeConnection =
    connections.find((connection) => connection.id === activeConnectionId) ??
    null
  const linksByRemoteId = new Map(
    calendarLinks.map((link) => [link.remoteCalendarId, link])
  )

  async function connectCaldav(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!onConnectCaldav) return
    const form = event.currentTarget
    const data = new FormData(form)
    const caldavUrl = String(data.get('caldavUrl') ?? '').trim()
    const username = String(data.get('username') ?? '').trim()
    const password = String(data.get('password') ?? '')
    if (!caldavUrl || !username || !password) return
    const connected = await onConnectCaldav({ caldavUrl, username, password })
    if (connected) form.reset()
  }

  return (
    <section
      className={cn('space-y-3 border-t pt-4', className)}
      aria-labelledby="work-calendar-sync-heading"
    >
      <header>
        <p id="work-calendar-sync-heading" className="text-sm font-medium">
          Connected calendars
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          Import external calendars into Work and keep them synchronized.
        </p>
      </header>

      {canManage ? (
        <div className="flex flex-wrap gap-2">
          {onConnectOAuth ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => void onConnectOAuth('GOOGLE')}
                className="border-876-surface-border rounded-lg border px-2.5 py-1.5 text-xs font-medium disabled:opacity-60"
              >
                Connect Google
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => void onConnectOAuth('MICROSOFT')}
                className="border-876-surface-border rounded-lg border px-2.5 py-1.5 text-xs font-medium disabled:opacity-60"
              >
                Connect Microsoft
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {canManage && onConnectCaldav ? (
        <details className="border-876-surface-border rounded-lg border p-2">
          <summary className="cursor-pointer text-xs font-medium">
            Connect CalDAV
          </summary>
          <form onSubmit={connectCaldav} className="mt-2 space-y-2 border-t pt-2">
            <input
              name="caldavUrl"
              type="url"
              required
              placeholder="https://calendar.example.com/dav"
              autoComplete="url"
              disabled={pending}
              aria-label="CalDAV server URL"
              className="border-876-surface-border bg-background w-full rounded-lg border px-2.5 py-2 text-sm"
            />
            <input
              name="username"
              required
              placeholder="Username"
              autoComplete="username"
              disabled={pending}
              aria-label="CalDAV username"
              className="border-876-surface-border bg-background w-full rounded-lg border px-2.5 py-2 text-sm"
            />
            <input
              name="password"
              type="password"
              required
              placeholder="Password or app password"
              autoComplete="current-password"
              disabled={pending}
              aria-label="CalDAV password"
              className="border-876-surface-border bg-background w-full rounded-lg border px-2.5 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={pending}
              className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-60"
            >
              Connect CalDAV
            </button>
          </form>
        </details>
      ) : null}

      {connections.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          No external calendar connections.
        </p>
      ) : (
        <select
          value={activeConnectionId ?? ''}
          onChange={(event) => onSelectConnection(event.target.value || null)}
          aria-label="External calendar connection"
          className="border-876-surface-border bg-background w-full rounded-lg border px-2.5 py-2 text-sm"
        >
          <option value="">Select a connection</option>
          {connections.map((connection) => (
            <option key={connection.id} value={connection.id}>
              {providerLabel(connection.provider)}
              {connection.remoteAccountLabel
                ? ` — ${connection.remoteAccountLabel}`
                : ''}
            </option>
          ))}
        </select>
      )}

      {activeConnection ? (
        <div className="border-876-surface-border space-y-3 rounded-lg border p-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium">
                {providerLabel(activeConnection.provider)}
              </p>
              <p className="text-muted-foreground text-xs">
                {activeConnection.authorized ? 'Authorized' : 'Authorization required'}
                {' · '}
                {activeConnection.status.toLowerCase()}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {canManage &&
              !activeConnection.authorized &&
              activeConnection.provider !== 'CALDAV' &&
              onAuthorize ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void onAuthorize(activeConnection)}
                  className="border-876-surface-border rounded-lg border px-2 py-1 text-xs font-medium disabled:opacity-60"
                >
                  Authorize
                </button>
              ) : null}
              {canManage && activeConnection.authorized && onSyncConnection ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void onSyncConnection(activeConnection)}
                  className="border-876-surface-border rounded-lg border px-2 py-1 text-xs font-medium disabled:opacity-60"
                >
                  Sync now
                </button>
              ) : null}
              {canManage && onDisconnect ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void onDisconnect(activeConnection)}
                  className="border-876-surface-border text-destructive rounded-lg border px-2 py-1 text-xs font-medium disabled:opacity-60"
                >
                  Disconnect
                </button>
              ) : null}
            </div>
          </div>

          {activeConnection.lastErrorCode ? (
            <p className="text-destructive text-xs" role="status">
              Last sync error: {activeConnection.lastErrorCode}
            </p>
          ) : null}

          {!activeConnection.authorized ? null : loadingRemoteCalendars ? (
            <p className="text-muted-foreground text-xs">Loading calendars…</p>
          ) : remoteCalendars.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              No remote calendars available.
            </p>
          ) : (
            <div className="space-y-2">
              {remoteCalendars.map((remoteCalendar) => {
                const link = linksByRemoteId.get(remoteCalendar.remoteId)
                return (
                  <div
                    key={remoteCalendar.remoteId}
                    className="border-876-surface-border flex items-center justify-between gap-2 rounded-lg border p-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">
                        {remoteCalendar.name}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {link
                          ? link.syncDirection === 'PULL_ONLY'
                            ? 'Linked · read only'
                            : 'Linked · two-way sync'
                          : remoteCalendar.readOnly
                            ? 'Read only'
                            : 'Not linked'}
                      </p>
                    </div>
                    {canManage ? (
                      <div className="flex shrink-0 gap-1.5">
                        {link && onSyncCalendar ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => void onSyncCalendar(link)}
                            className="border-876-surface-border rounded-lg border px-2 py-1 text-xs font-medium disabled:opacity-60"
                          >
                            Sync
                          </button>
                        ) : null}
                        {link && onUnlinkCalendar ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => void onUnlinkCalendar(link)}
                            className="border-876-surface-border rounded-lg border px-2 py-1 text-xs font-medium disabled:opacity-60"
                          >
                            Unlink
                          </button>
                        ) : !link && onLinkCalendar ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              void onLinkCalendar(activeConnection, remoteCalendar)
                            }
                            className="bg-primary text-primary-foreground rounded-lg px-2 py-1 text-xs font-medium disabled:opacity-60"
                          >
                            Link
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : null}
    </section>
  )
}
