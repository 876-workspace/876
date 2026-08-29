import { AppError } from '@876/ui/app-error'
import { Page } from '@876/ui/page'
import { notFound } from 'next/navigation'

import { get876Client } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'

import { TeamForm, type TeamFormValues } from '../../_components/team-form'

type Props = { params: Promise<{ teamId: string }> }

export const metadata = { title: 'Edit Team - Settings' }

export default async function EditTeamPage({ params }: Props) {
  const { teamId } = await params
  const context = await requireCrmContext()
  const $876 = await get876Client()
  const result = await $876.teams.retrieve(context.orgId, teamId)
  if (result.error?.code === 'crm/team-not-found') notFound()

  if (result.error)
    return (
      <Page>
        <h1 className="876-page-title mb-4">Edit team</h1>
        <AppError
          title="Team data is temporarily unavailable"
          error={result.error}
          variant="banner"
        />
      </Page>
    )

  const initial: TeamFormValues = {
    name: result.data.name,
    description: result.data.description ?? '',
    color: result.data.color ?? 'blue',
    autoAssign: result.data.autoAssign,
    isDefault: result.data.isDefault,
  }

  return (
    <Page>
      <h1 className="876-page-title mb-6">Edit team</h1>
      <TeamForm teamId={teamId} initial={initial} />
    </Page>
  )
}
