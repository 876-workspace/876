import {
  WorkSyncProviderError,
  type WorkPullResult,
  type WorkSyncProviderAdapter,
} from '../../providers/sync/index.js'

const nowSeconds = () => Math.floor(Date.now() / 1000)
const stamp = (value: Date | null) =>
  value ? Math.floor(value.getTime() / 1000) : null

export type CalendarCursorState = {
  remoteId: string
  syncCursor: string | null
  syncWindowStart: Date | null
  syncWindowEnd: Date | null
}

export async function pullProviderCalendar(input: {
  providerName: string
  provider: Pick<WorkSyncProviderAdapter, 'pull'>
  mapping: CalendarCursorState
}): Promise<WorkPullResult> {
  const now = nowSeconds()
  const rolloverMicrosoftWindow =
    input.providerName === 'MICROSOFT' &&
    input.mapping.syncWindowEnd &&
    Math.floor(input.mapping.syncWindowEnd.getTime() / 1000) <
      now + 90 * 24 * 60 * 60
  const pullInput = {
    remoteCalendarId: input.mapping.remoteId,
    cursor: rolloverMicrosoftWindow ? null : input.mapping.syncCursor,
    windowStart: rolloverMicrosoftWindow
      ? null
      : stamp(input.mapping.syncWindowStart),
    windowEnd: rolloverMicrosoftWindow
      ? null
      : stamp(input.mapping.syncWindowEnd),
  }

  try {
    return await input.provider.pull(pullInput)
  } catch (error) {
    if (
      error instanceof WorkSyncProviderError &&
      error.code === 'provider-cursor-invalid'
    )
      return input.provider.pull({ ...pullInput, cursor: null })
    throw error
  }
}
