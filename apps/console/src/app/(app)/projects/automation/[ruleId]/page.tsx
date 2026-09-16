import { Page } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { AutomationRuleDetailData } from '@/features/projects/components/automation-rule-detail-data'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { projects } from '@/lib/services/projects'

import { requirePlatformProjectsOrgId } from '../../_lib/base'

type Props = {
  params: Promise<{ ruleId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ruleId } = await params
  const organizationId = await requirePlatformProjectsOrgId()

  const result = await projects.automationRules.retrieve(
    organizationId,
    decodeURIComponent(ruleId)
  )
  if (!result.data) return { title: 'Automation rule' }

  return { title: `${result.data.name} • Automation` }
}

export default async function PlatformAutomationRulePage({ params }: Props) {
  const { ruleId } = await params

  return (
    <Page>
      <Suspense fallback={<AutomationRuleFallback />}>
        <AutomationRuleSection ruleId={ruleId} />
      </Suspense>
    </Page>
  )
}

async function AutomationRuleSection({ ruleId }: { ruleId: string }) {
  const organizationId = await requirePlatformProjectsOrgId()

  return (
    <AutomationRuleDetailData
      organizationId={organizationId}
      base={projectsBase(null)}
      ruleId={ruleId}
    />
  )
}

function AutomationRuleFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-4 w-96" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}
