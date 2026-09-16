import { PageBreadcrumb } from '@/components/page-breadcrumb'
import {
  requireAppPermission,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { blankUiRule } from '@/lib/automation-mappers'

import { AutomationRuleForm } from '../_components/automation-rule-form'

export const metadata = { title: 'New automation rule' }

export default async function NewAutomationRulePage() {
  await requireAppPermission('settings.edit')
  await requireProjectsContext()

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb
        href="/settings/automation"
        label="Automation rules"
        className="mb-4"
      />
      <h1 className="876-page-title mb-2">New rule</h1>
      <AutomationRuleForm mode="create" initial={blankUiRule()} />
    </div>
  )
}
