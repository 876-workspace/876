import * as repository from './work-structure.repository.js'

/**
 * Lightweight public lookup used by sibling domain modules that need to
 * validate a tenant-owned work item type without importing the full work
 * structure service (which itself depends on projects/issues orchestration).
 */
export async function resolveOwnedWorkItemType(tenantId: string, id: string) {
  return repository.retrieveWorkItemType(tenantId, id)
}
