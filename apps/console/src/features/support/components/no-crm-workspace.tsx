import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { ChatBubbleLeftIcon } from '@876/ui/icons'

/**
 * Shown when CRM has no workspace for an organization.
 *
 * This is a state, not a failure: an organization gets a CRM workspace the
 * first time it uses CRM, so one that never has simply has nothing here. The
 * Requests tab is already hidden unless the organization is entitled to CRM, so
 * this is what a direct visit to the URL should say rather than an error page.
 */
export function NoCrmWorkspace() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ChatBubbleLeftIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No CRM workspace</EmptyTitle>
        <EmptyDescription>
          This organization has not used CRM yet.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
