import { randomUUID } from 'node:crypto'

export const ENTITY_PREFIXES = {
  tenant: 'prjten_',
  project: 'prj_',
  projectMember: 'prjmem_',
  issue: 'iss_',
  label: 'lbl_',
  comment: 'cmt_',
  issueEvent: 'isev_',
} as const

export type EntityType = keyof typeof ENTITY_PREFIXES

export function generateId(entityType: EntityType): string {
  const prefix = ENTITY_PREFIXES[entityType]
  if (!prefix) throw new Error(`Unknown entity type: ${entityType}`)

  return `${prefix}${randomUUID().replaceAll('-', '')}`
}
