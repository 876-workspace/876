import type { Metadata } from 'next'
import type { AdminApp } from '@876/admin'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Calendar, Fingerprint, KeyRound } from '@876/ui/icons'
import { Skeleton } from '@876/ui/skeleton'

import { InfoSection, Field } from '@/components/patterns/detail/info-section'
import { $876 } from '@/lib/876'
import { formatDate } from '@/lib/format'
import { resolveApp } from '../_data'
import {
  DangerSection,
  GeneralSection,
  IconSection,
  OwnershipSection,
  type OrgOption,
} from './_components/settings-editor'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'App not found' }
  return { title: `${app.name} - Settings` }
}

function ValueList({ values }: { values: string[] }) {
  if (values.length === 0) return <>—</>

  return (
    <span className="flex w-full min-w-0 flex-col items-end gap-1 whitespace-normal">
      {values.map((value) => (
        <span key={value} className="max-w-full truncate">
          {value}
        </span>
      ))}
    </span>
  )
}

export default function AppSettingsPage({ params }: Props) {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <AppSettingsData params={params} />
    </Suspense>
  )
}

async function AppSettingsData({ params }: Props) {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) notFound()

  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <AppSettingsContent app={app} />
    </Suspense>
  )
}

async function AppSettingsContent({ app }: { app: AdminApp }) {
  const { data: orgList } = await $876.organizations.list({ limit: 100 })
  const orgs: OrgOption[] = (orgList?.data ?? []).map((org) => ({
    id: org.id,
    name: org.name ?? org.slug,
    logo_url: org.logo_url,
  }))

  // The owning org must always be selectable, even when it falls outside the
  // first page of options.
  if (
    app.organization_id &&
    !orgs.some((org) => org.id === app.organization_id)
  ) {
    const { data: owningOrg } = await $876.organizations.retrieve(
      app.organization_id
    )
    orgs.unshift({
      id: app.organization_id,
      name: owningOrg?.name ?? owningOrg?.slug ?? app.organization_id,
      logo_url: owningOrg?.logo_url ?? null,
    })
  }

  return (
    <div>
      <h1 className="876-page-title mb-5">Settings</h1>

      <div className="space-y-5">
        <IconSection app={app} />

        <GeneralSection app={app} />

        <OwnershipSection app={app} orgs={orgs} />

        <InfoSection title="Identifiers" icon={Fingerprint}>
          <Field label="Slug" value={app.slug} mono />
          <Field label="Platform ID" value={app.id} mono />
          <Field label="Client ID" value={app.client_id} mono />
          <Field
            label="Client type"
            value={<span className="capitalize">{app.client_type}</span>}
          />
        </InfoSection>

        <InfoSection title="OAuth" icon={KeyRound}>
          <Field
            label="Redirect URIs"
            value={<ValueList values={app.allowed_redirect_uris} />}
            mono
          />
          <Field
            label="Logout URIs"
            value={<ValueList values={app.allowed_logout_uris} />}
            mono
          />
          <Field
            label="Scopes"
            value={<ValueList values={app.scopes_allowed} />}
            mono
          />
        </InfoSection>

        <InfoSection title="Timeline" icon={Calendar}>
          <Field label="Registered" value={formatDate(app.created_at)} />
          <Field label="Last updated" value={formatDate(app.updated_at)} />
        </InfoSection>

        <DangerSection app={app} />
      </div>
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <div>
      <Skeleton className="mb-5 h-8 w-28" />
      <div className="space-y-5">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  )
}
