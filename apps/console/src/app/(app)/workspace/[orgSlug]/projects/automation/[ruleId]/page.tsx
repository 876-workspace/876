import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { AutomationRuleDetailData } from '@/features/projects/components/automation-rule-detail-data'
import { projects } from '@/lib/services/projects'

import { resolveOrg } from '@/features/orgs/org-data'
import { projectsBase } from '@/features/orgs/app-workspaces'

type Props = {
  params: Promise<{ orgSlug: string; ruleId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, ruleId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Automation rule' }

  const result = await projects.automationRules.retrieve(
    org.id,
    decodeURIComponent(ruleId)
  )
  if (!result.data) return { title: 'Automation rule' }

  return { title: `${result.data.name} • Automation - Organizations` }
}

export default async function OrganizationAutomationRulePage({
  params,
}: Props) {
  const { orgSlug, ruleId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <Suspense fallback={<AutomationRuleFallback />}>
      <AutomationRuleDetailData
        organizationId={org.id}
        base={projectsBase(orgSlug)}
        ruleId={ruleId}
      />
    </Suspense>
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
