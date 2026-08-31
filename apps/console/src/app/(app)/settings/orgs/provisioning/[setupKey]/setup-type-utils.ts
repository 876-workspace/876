import type { FinanceResourceDefinition } from '@/features/provisioning/finance-provisioning-utils'

/** Extract the canonical string key for a resource type definition. */
export function getDefinitionType(definition: FinanceResourceDefinition): string {
  return (
    definition.resource_type ||
    (definition as { resourceType?: string }).resourceType ||
    ''
  )
}
