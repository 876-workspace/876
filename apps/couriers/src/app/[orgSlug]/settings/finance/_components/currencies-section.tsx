import { AppError } from '@876/ui/app-error'

import { getAppError } from '@/lib/errors'

/**
 * Couriers has no Billing currency resource yet, so this section states that
 * plainly instead of rendering an empty table that implies data could exist.
 */
export function CurrenciesSection() {
  return (
    <section aria-label="Currencies" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="876-page-title">Currencies</h2>
      </div>
      <AppError
        title="Currencies could not be loaded"
        error={getAppError('finance/currencies-unavailable')}
        variant="section"
      />
    </section>
  )
}
