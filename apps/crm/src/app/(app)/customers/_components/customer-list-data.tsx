import { AppError } from '@876/ui/app-error'

import { getCustomerRows } from '../_lib/customers-data'
import { CustomerList } from './customer-list'

/**
 * Data half of the list column. Rendered from the layout inside a Suspense
 * boundary, so the toolbar is interactive before this resolves.
 */
export async function CustomerListData() {
  const { rows, error } = await getCustomerRows()

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {error ? (
        <AppError
          title="Some customer data could not be loaded"
          error={error}
          variant="banner"
        />
      ) : null}
      <CustomerList customers={rows} />
    </div>
  )
}
