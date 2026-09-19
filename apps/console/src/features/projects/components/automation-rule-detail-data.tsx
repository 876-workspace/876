import Link from 'next/link'

import {
  ACTION_LABELS,
  TRIGGER_LABELS,
} from '@876/projects-ui/automation/labels'
import { AutomationRunTable } from '@876/projects-ui/automation/automation-run-table'
import { AppError } from '@876/ui/app-error'
import { Badge } from '@876/ui/badge'
import {
  DetailCardFact,
  DetailCardFacts,
  DetailCardSection,
} from '@876/ui/detail-card'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { SparklesIcon } from '@876/ui/icons'
import { notFound } from 'next/navigation'

import { toUiAutomationRule, toUiAutomationRun } from '../automation-mappers'
import { projects } from '@/lib/clients/projects'

function formatConditionValue(value: string | string[] | undefined): string {
  if (value === undefined) return ''
  return Array.isArray(value) ? value.join(', ') : value
}

function formatActionParams(
  params: Record<string, string | number | boolean | null>
): string {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== '' && value !== null && value !== undefined
  )
  if (entries.length === 0) return '—'
  return entries
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' · ')
}

/**
 * The data half of the Automation rule detail, shared by every host.
 * Read-only: the rule definition (trigger, conditions, actions, webhook
 * presence) plus its runs through the shared `AutomationRunTable`. The
 * webhook secret value is never fetched or rendered — only the
 * `hasWebhookSecret` presence flag.
 */
export async function AutomationRuleDetailData({
  organizationId,
  base,
  ruleId,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
  ruleId: string
}) {
  const decodedId = decodeURIComponent(ruleId)
  const [ruleResult, runsResult] = await Promise.all([
    projects.automationRules.retrieve(organizationId, decodedId),
    projects.automationRules.listRuns(organizationId, decodedId),
  ])

  if (ruleResult.error?.code === 'projects/automation-rule-not-found')
    notFound()

  if (ruleResult.error || !ruleResult.data) {
    return (
      <AppError
        title="Automation rule could not be loaded"
        error={ruleResult.error}
        variant="banner"
        showCode
      />
    )
  }

  const rule = toUiAutomationRule(ruleResult.data)
  const runs = (runsResult.data?.data ?? []).map(toUiAutomationRun)

  return (
    <div className="space-y-6">
      {runsResult.error ? (
        <AppError
          title="Some automation details could not be loaded"
          error={runsResult.error}
          variant="banner"
          showCode
        />
      ) : null}
      <section className="876-card space-y-6 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">
              {TRIGGER_LABELS[rule.trigger] ?? rule.trigger}
            </p>
            <h2 className="mt-1 text-lg font-semibold">{rule.name}</h2>
          </div>
          <Badge variant={rule.enabled ? 'success' : 'secondary'}>
            {rule.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
        <DetailCardSection title="Details">
          <DetailCardFacts>
            <DetailCardFact
              label="Trigger"
              value={TRIGGER_LABELS[rule.trigger] ?? rule.trigger}
            />
            <DetailCardFact
              label="Scope"
              value={rule.projectId ?? 'Organization'}
            />
            <DetailCardFact
              label="Webhook secret"
              value={
                rule.hasWebhookSecret ? (
                  <Badge variant="info">Configured</Badge>
                ) : (
                  'Not configured'
                )
              }
            />
          </DetailCardFacts>
        </DetailCardSection>
        <DetailCardSection title="Conditions">
          {rule.conditions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Always runs when the trigger fires.
            </p>
          ) : (
            <ul className="space-y-1">
              {rule.conditions.map((condition, index) => (
                <li
                  key={`${condition.fieldKey}:${condition.op}:${index}`}
                  className="font-mono text-xs"
                >
                  {condition.fieldKey} {condition.op}
                  {condition.value === undefined
                    ? ''
                    : ` ${formatConditionValue(condition.value)}`}
                </li>
              ))}
            </ul>
          )}
        </DetailCardSection>
        <DetailCardSection title={`Actions (${rule.actions.length})`}>
          {rule.actions.length === 0 ? (
            <Empty className="py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SparklesIcon className="size-6" />
                </EmptyMedia>
                <EmptyTitle>No actions yet</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="space-y-2">
              {rule.actions.map((action, index) => (
                <li
                  key={`${action.type}:${index}`}
                  className="flex flex-col gap-0.5"
                >
                  <span className="text-sm font-medium">
                    {ACTION_LABELS[action.type] ?? action.type}
                  </span>
                  <span className="text-muted-foreground font-mono text-xs">
                    {formatActionParams(action.params)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DetailCardSection>
      </section>
      <section aria-label="Runs" className="space-y-3">
        <h2 className="text-[0.9375rem] font-semibold">
          Runs ({runs.length})
        </h2>
        <AutomationRunTable runs={runs} />
      </section>
      <Link
        href={`${base}/automation`}
        className="text-muted-foreground text-sm hover:underline"
      >
        Back to automation
      </Link>
    </div>
  )
}
