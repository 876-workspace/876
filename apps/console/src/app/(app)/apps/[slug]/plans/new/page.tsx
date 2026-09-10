import { listAppModules } from '@/lib/console/modules'
import { getError, toAppError } from '@876/core/errors'
import { listConsoleApps } from '@/lib/apps-catalog'
import type { CreatePlanSetup } from '@/types/plans'
import type { Metadata } from 'next'

import { resolveApp } from '../../_data'
import { CreatePlanForm } from './_components/create-plan-form'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'New Plan' }
  return { title: `New Plan • ${app.name} - Apps` }
}

export default async function NewPlanPage({ params }: Props) {
  const { slug } = await params
  const setup = loadPlanSetup(slug)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="876-page-title">New Plan</h1>
      </div>

      <CreatePlanForm appSlug={slug} setup={setup} />
    </div>
  )
}

async function loadPlanSetup(slug: string): Promise<CreatePlanSetup> {
  const { apps, error } = await listConsoleApps()
  if (error) return { data: null, error }
  const app = apps?.find((candidate) => candidate.slug === slug)
  if (!app) return { data: null, error: toAppError(getError('app/not-found')) }

  const result = await listAppModules(app.id, false)
  if (result.error) return { data: null, error: result.error }

  return {
    data: { appId: app.id, modules: result.data.data },
    error: null,
  }
}
