import { randomUUID } from 'node:crypto'

export const ENTITY_PREFIXES = {
  domain: 'edom_',
  sender: 'esnd_',
  template: 'etpl_',
  delivery: 'edel_',
  deliveryEvent: 'edevt_',
} as const

export type EntityType = keyof typeof ENTITY_PREFIXES

export function generateId(entityType: EntityType): string {
  return `${ENTITY_PREFIXES[entityType]}${randomUUID().replaceAll('-', '')}`
}
