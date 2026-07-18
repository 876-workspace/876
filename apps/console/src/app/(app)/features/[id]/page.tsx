import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Fingerprint, Settings, Calendar } from '@876/ui/icons'
import { InfoSection, Field } from '@/components/detail/info-section'
import { formatDate } from '@/lib/format'
import { resolveFeature } from './_data'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const feature = await resolveFeature(id)
  if (!feature) return { title: 'Feature not found' }
  return { title: `${feature.name} - Features` }
}

export default async function FeatureOverviewPage({ params }: Props) {
  const { id } = await params
  const feature = await resolveFeature(id)
  if (!feature) notFound()

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <InfoSection title="Identity" icon={Fingerprint}>
        <Field label="Name" value={feature.name} />
        <Field label="Slug" value={feature.slug} mono />
        <Field label="Provider" value={feature.provider} />
        <Field
          label="Provider ID"
          value={feature.provider_feature_id ?? '—'}
          mono
        />
        <Field label="Platform ID" value={feature.id} mono />
        <Field label="Description" value={feature.description ?? '—'} />
      </InfoSection>

      <InfoSection title="Configuration" icon={Settings}>
        <Field label="Scope" value={feature.scope} />
        <Field
          label="Globally enabled"
          value={feature.enabled ? 'Yes' : 'No'}
        />
        <Field
          label="Default value"
          value={feature.default_value ? 'Yes' : 'No'}
        />
        <Field
          label="Consumer default"
          value={feature.consumer_default_enabled ? 'Enabled' : 'Disabled'}
        />
      </InfoSection>

      <InfoSection title="Timestamps" icon={Calendar}>
        <Field label="Provider synced" value={formatDate(feature.synced_at)} />
        <Field label="Record created" value={formatDate(feature.created_at)} />
        <Field label="Record updated" value={formatDate(feature.updated_at)} />
      </InfoSection>
    </div>
  )
}
