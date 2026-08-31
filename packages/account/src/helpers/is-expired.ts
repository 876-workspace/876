import { nowUnixSeconds } from '@876/core/timestamps'

export function isExpired(item: { expires_at?: number | null }): boolean {
  return item.expires_at != null && item.expires_at < nowUnixSeconds()
}
