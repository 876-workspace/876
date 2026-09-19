import { AutomationRunTable } from '@876/projects-ui/automation/automation-run-table'
import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import {
  requireAppPermission,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { serviceRuleToUi } from '@/lib/automation-mappers'
import { projects } from '@/lib/clients/projects'

import { AutomationRuleForm } from '../_components/automation-rule-form'
import { AutomationTestPanel } from './_components/automation-test-panel'

export const metadata = { title: 'Edit automation rule' }

type Props = { params: Promise<{ ruleId: string }> }

export default async function EditAutomationRulePage({ params }: Props) {
  await requireAppPermission('settings.edit')
  const { orgId } = await requireProjectsContext()
  const { ruleId } = await params
  const decodedId = decodeURIComponent(ruleId)

  const [rule, runs] = await Promise.all([
    projects.automationRules.retrieve(orgId, decodedId),
    projects.automationRules.listRuns(orgId, decodedId),
  ])

  if (rule.error?.code === 'projects/automation-rule-not-found') notFound()
  if (rule.error || !rule.data)
    return (
      <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
        <PageBreadcrumb
          href="/settings/automation"
          label="Automation rules"
          className="mb-4"
        />
        <AppError
          title="The rule could not be loaded"
          error={
            rule.error ?? {
              code: 'projects/automation-unavailable',
              message: 'The rule could not be loaded.',
            }
          }
          variant="banner"
        />
      </div>
    )

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb
        href="/settings/automation"
        label="Automation rules"
        className="mb-4"
      />
      <h1 className="876-page-title mb-2">Edit rule</h1>
      <p className="text-muted-foreground mb-6 text-sm">{rule.data.name}</p>
      <div className="flex max-w-3xl flex-col gap-8">
        <AutomationRuleForm
          mode="edit"
          ruleId={rule.data.id}
          initial={serviceRuleToUi(rule.data)}
        />
        <AutomationTestPanel ruleId={rule.data.id} />
        <section aria-label="Runs" className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Runs</h2>
          {runs.error ? (
            <AppError
              title="Runs could not be loaded"
              error={runs.error}
              variant="banner"
            />
          ) : (
            <AutomationRunTable
              runs={(runs.data?.data ?? []).map((run) => ({
                object: 'projects.automation-run' as const,
                id: run.id,
                ruleId: run.ruleId,
                eventId: run.eventId,
                status: run.status,
                errorCode: run.errorCode,
                attempt: run.attempt,
                startedAt: run.startedAt,
                finishedAt: run.finishedAt,
              }))}
            />
          )}
        </section>
      </div>
    </div>
  )
}
