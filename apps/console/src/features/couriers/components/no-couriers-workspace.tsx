import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { TruckIcon } from '@876/ui/icons'

/**
 * Shown when Couriers has no tenant for an organization.
 *
 * A Couriers tenant is created the first time an organization uses Couriers, so
 * one that never has simply has nothing here. This is a state, not a failure —
 * an `AppError` would report an outage that has not happened.
 */
export function NoCouriersWorkspace() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TruckIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No Couriers workspace</EmptyTitle>
        <EmptyDescription>
          This organization has not used Couriers yet.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
