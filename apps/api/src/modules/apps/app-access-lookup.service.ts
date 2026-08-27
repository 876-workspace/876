import * as repository from './apps.repository'
import { serializeApp } from './apps.serializers'
import type { App } from './apps.schemas'

/** Read one registered app for another bounded module without exposing Prisma. */
export async function findAppForAccessById(appId: string): Promise<App | null> {
  const row = await repository.findAppById(appId)
  return row ? serializeApp(row) : null
}

/** Resolve an app slug for another bounded module without exposing Prisma. */
export async function findAppForAccessBySlug(slug: string): Promise<App | null> {
  const row = await repository.findAppBySlug(slug)
  return row ? serializeApp(row) : null
}

/** Batch registered-app lookup used by app-membership list surfaces. */
export async function listAppsForAccess(appIds: readonly string[]): Promise<App[]> {
  const ids = [...new Set(appIds)]
  if (ids.length === 0) return []

  const rows = await Promise.all(ids.map((id) => repository.findAppById(id)))
  return rows.filter((row) => row !== null).map((row) => serializeApp(row))
}
