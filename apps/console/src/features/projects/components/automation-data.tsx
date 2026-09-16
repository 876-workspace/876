import { AutomationRuleList } from '@876/projects-ui/automation/automation-rule-list'
import { AppError } from '@876/ui/app-error'

import { toUiAutomationRule } from '../automation-mappers'
import { projects } from '@/lib/services/projects'

/**
 * The data half of the Automation rules list, shared by every host.
 * Read-only: the shared `AutomationRuleList` with links resolved against the
 * host's Projects root. No enable/disable, delete, or secret affordances —
 * the webhook secret is never fetched, only its `hasWebhookSecret` presence
 * flag travels with the rule.
 */
export async function AutomationData({
  organizationId,
  base,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
}) {
  const result = await projects.automationRules.list(organizationId)

  return (
    <div className="space-y-3">
      {result.error ? (
        <AppError
          title="Automation data could not be loaded"
          error={result.error}
          variant="banner"
          showCode
        />
      ) : null}
      <AutomationRuleList
        rules={(result.data?.data ?? []).map(toUiAutomationRule)}
        hrefBase={`${base}/automation`}
      />
    </div>
  )
}
