import { randomUUID } from 'node:crypto'

import * as repository from './sync-connections.repository.js'

const LEASE_TTL_MS = 2 * 60 * 1000
const HEARTBEAT_MS = 30 * 1000

type SyncLease = {
  connectionId: string
  token: string
}

function leaseWindow() {
  const now = new Date()
  return {
    now,
    expiresAt: new Date(now.getTime() + LEASE_TTL_MS),
  }
}

export async function acquire(connectionId: string): Promise<SyncLease | null> {
  const token = randomUUID()
  const window = leaseWindow()
  const acquired = await repository.acquireSyncLease({
    id: connectionId,
    token,
    ...window,
  })
  return acquired ? { connectionId, token } : null
}

async function heartbeat(lease: SyncLease) {
  const window = leaseWindow()
  return repository.heartbeatSyncLease({
    id: lease.connectionId,
    token: lease.token,
    ...window,
  })
}

export async function release(lease: SyncLease) {
  return repository.releaseSyncLease(lease.connectionId, lease.token)
}

export async function runWithLease<T>(
  connectionId: string,
  work: () => Promise<T>
): Promise<{ acquired: false } | { acquired: true; result: T }> {
  const lease = await acquire(connectionId)
  if (!lease) return { acquired: false }

  const timer = setInterval(() => {
    void heartbeat(lease)
  }, HEARTBEAT_MS)
  timer.unref()

  try {
    return { acquired: true, result: await work() }
  } finally {
    clearInterval(timer)
    await release(lease)
  }
}
