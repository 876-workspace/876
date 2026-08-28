const PRIVATE_NOTE_ROLES = new Set([
  'owner',
  'admin',
  'superadmin',
  'super_admin',
])

/** Whether an organization role may create notes scoped to its author. */
export function canCreatePrivateRequestNote(role: string): boolean {
  return PRIVATE_NOTE_ROLES.has(role.toLowerCase())
}
