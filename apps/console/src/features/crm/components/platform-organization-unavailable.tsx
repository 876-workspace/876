import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Building2 } from '@876/ui/icons'

export function PlatformOrganizationUnavailable() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Building2 aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>Support organization unavailable</EmptyTitle>
        <EmptyDescription>
          Console could not resolve the organization configured by
          CONSOLE_PLATFORM_ORG_SLUG. Set it to the platform tenant slug and try
          again.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
