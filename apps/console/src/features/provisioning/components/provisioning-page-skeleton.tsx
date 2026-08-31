import { FormRow } from '@876/ui/form-row'
import { Skeleton } from '@876/ui/skeleton'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { PROVISIONING_COLLECTION_COLUMNS } from '../provisioning-skeleton-columns'

/**
 * Shape-matched skeleton for the Workspace defaults tab (root setup view).
 * Mirrors FinanceSetupMetadataEditor + FinanceSingletonEditor with the top toolbar.
 */
export function WorkspaceTabSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-8 p-6">
          {/* Setup details */}
          <div className="max-w-2xl space-y-6">
            <div className="space-y-4">
              <h3 className="text-foreground text-sm font-semibold">
                Setup details
              </h3>

              <FormRow label="Key">
                <Skeleton className="h-9 w-full max-w-md" />
              </FormRow>

              <FormRow label="Name" required>
                <Skeleton className="h-9 w-full max-w-md" />
              </FormRow>

              <FormRow label="Description">
                <Skeleton className="h-16 w-full max-w-md" />
              </FormRow>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormRow label="Country">
                  <Skeleton className="h-9 w-full" />
                </FormRow>
                <FormRow label="Currency">
                  <Skeleton className="h-9 w-full" />
                </FormRow>
              </div>

              <div className="flex min-h-8 items-center justify-end gap-4 pt-2">
                <Skeleton className="h-9 w-24 rounded-md" />
              </div>
            </div>

            <div className="space-y-3 border-t pt-5">
              <h3 className="text-foreground text-sm font-semibold">
                Lifecycle
              </h3>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
            </div>
          </div>

          {/* Workspace defaults */}
          <div className="max-w-2xl space-y-4 border-t pt-6">
            <h3 className="text-foreground text-sm font-semibold">
              Workspace defaults
            </h3>
            <div className="max-w-2xl space-y-4">
              <FormRow label="Country" required>
                <Skeleton className="h-9 w-full max-w-md" />
              </FormRow>
              <FormRow label="Base currency" required>
                <Skeleton className="h-9 w-full max-w-md" />
              </FormRow>
              <FormRow label="Default currency" required>
                <Skeleton className="h-9 w-full max-w-md" />
              </FormRow>
              <FormRow label="Default language" required>
                <Skeleton className="h-9 w-full max-w-md" />
              </FormRow>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Shape-matched skeleton for invoice preferences (singleton resource type).
 */
export function InvoicePreferenceTabSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="876-header-row flex shrink-0 items-center justify-between gap-2 border-b px-5 py-2">
        <div className="flex items-center gap-2" />
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="size-8 rounded-md" />
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="max-w-2xl space-y-4">
            <FormRow label="Tax behavior" required>
              <Skeleton className="h-9 w-full max-w-md" />
            </FormRow>
            <FormRow label="Late fees enabled" required>
              <Skeleton className="h-9 w-full max-w-md" />
            </FormRow>
            <FormRow label="Late fee calculation" required>
              <Skeleton className="h-9 w-full max-w-md" />
            </FormRow>
            <FormRow label="Late fee percent">
              <Skeleton className="h-9 w-full max-w-md" />
            </FormRow>
            <FormRow label="Late fee amount">
              <Skeleton className="h-9 w-full max-w-md" />
            </FormRow>
            <FormRow label="Grace days" required>
              <Skeleton className="h-9 w-full max-w-md" />
            </FormRow>
            <FormRow label="Generate as draft" required>
              <Skeleton className="h-9 w-full max-w-md" />
            </FormRow>
          </div>
        </div>
      </div>
    </div>
  )
}

const DEFAULT_COLLECTION_COLUMNS = [
  { label: 'Name', cellWidth: '200px' },
  { label: 'Actions', srOnly: true, width: '7rem' },
]

/**
 * Shape-matched skeleton for collection resource types (currencies, payment modes,
 * payment terms, tax authorities, tax rates).
 */
export function CollectionTabSkeleton({
  resourceType,
}: {
  resourceType: string
}) {
  const columns =
    PROVISIONING_COLLECTION_COLUMNS[resourceType] ?? DEFAULT_COLLECTION_COLUMNS

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="876-header-row flex shrink-0 items-center justify-between gap-2 border-b px-5 py-2">
        <div className="flex items-center gap-2" />
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="size-8 rounded-md" />
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <DataTableSkeleton card={false} columns={columns} rows={5} />
      </div>
    </div>
  )
}

/**
 * Renders the matching skeleton for any resource type under a provisioning setup.
 */
export function ProvisioningResourceTypeSkeleton({
  resourceType,
}: {
  resourceType?: string
}) {
  if (resourceType === 'workspace') {
    return <WorkspaceTabSkeleton />
  }

  if (resourceType === 'invoice_preference') {
    return <InvoicePreferenceTabSkeleton />
  }

  return <CollectionTabSkeleton resourceType={resourceType ?? 'currency'} />
}
