import { pingDb } from '@/db/client'

export async function databaseIsReady(): Promise<boolean> {
  return pingDb()
}
