import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import {
  CheckCircle2,
  CodeBracketIcon,
  Flag,
  ShieldCheck,
  User,
  Users,
  XCircleIcon,
  type IconComponent,
} from '@876/ui/icons'

import { formatDate } from '@/lib/format'
import { resolveFeature } from '../../../../../features/[id]/_data'
import { resolveApp } from '../../../_data'

type Props = {
  params: Promise<{ slug: string; featureId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, featureId } = await params
  const [app, feature] = await Promise.all([
    resolveApp(slug),
    resolveFeature(featureId),
  ])
  if (!app || !feature || feature.app_id !== app.id)
    return { title: 'Feature config' }

  return { title: `${feature.name} • Config - ${app.name} Features` }
}

export default async function AppFeatureConfigPage({ params }: Props) {
  const { slug, featureId } = await params
  const [app, feature] = await Promise.all([
    resolveApp(slug),
    resolveFeature(featureId),
  ])
  if (!app || !feature || feature.app_id !== app.id) notFound()

  return (
    <div className="space-y-5">
      <section className="border-876-surface-border border-y py-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={feature.enabled ? 'success' : 'secondary'}>
            {feature.enabled ? 'Serving' : 'Stopped'}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {feature.scope}
          </Badge>
          <Badge variant={feature.server_side_only ? 'warning' : 'secondary'}>
            {feature.server_side_only ? 'Server-side' : 'Client visible'}
          </Badge>
        </div>
        <p className="mt-3 max-w-4xl text-sm leading-6">
          {feature.description ||
            'No description has been added for this feature.'}
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <SignalTile
          icon={feature.enabled ? CheckCircle2 : XCircleIcon}
          label="App default"
          value={feature.enabled ? 'Enabled' : 'Disabled'}
          tone={feature.enabled ? 'success' : 'muted'}
        />
        <SignalTile
          icon={Flag}
          label="Default value"
          value={feature.default_value ? 'True' : 'False'}
        />
        <SignalTile
          icon={Users}
          label="Consumer default"
          value={feature.consumer_default_enabled ? 'Enabled' : 'Disabled'}
        />
      </section>

      <section className="border-876-surface-border border-y py-5">
        <h3 className="text-sm font-semibold">Resolution order</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <ResolutionStep
            icon={Flag}
            title="App default"
            description={`${app.name} receives the base setting.`}
          />
          <ResolutionStep
            icon={Users}
            title="Organization override"
            description="An org can be forced on or off for this app."
          />
          <ResolutionStep
            icon={User}
            title="User override"
            description="A user override wins for targeted access."
          />
        </div>
      </section>

      <section className="border-876-surface-border border-y py-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">Technical details</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Identifiers and provider fields for API/debug work.
          </p>
        </div>
        <MetadataGrid
          rows={[
            ['Slug', feature.slug],
            ['Platform ID', feature.id],
            ['Provider', feature.provider],
            ['Provider feature ID', feature.provider_feature_id ?? '-'],
            ['Provider environment ID', feature.provider_environment_id ?? '-'],
            ['App', app.name],
            ['Mirror synced', formatDate(feature.synced_at)],
          ]}
        />
      </section>
    </div>
  )
}

function SignalTile({
  icon: Icon,
  label,
  value,
  tone = 'default',
}: {
  icon: IconComponent
  label: string
  value: string
  tone?: 'default' | 'success' | 'muted'
}) {
  return (
    <div className="border-876-surface-border flex min-h-24 items-start gap-3 border px-4 py-3">
      <span
        className={
          tone === 'success'
            ? 'text-success mt-0.5'
            : tone === 'muted'
              ? 'text-muted-foreground mt-0.5'
              : 'text-info mt-0.5'
        }
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs font-medium uppercase">
          {label}
        </p>
        <p className="mt-1 truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  )
}

function ResolutionStep({
  icon: Icon,
  title,
  description,
}: {
  icon: IconComponent
  title: string
  description: string
}) {
  return (
    <div className="border-876-surface-border flex min-h-28 gap-3 border px-4 py-3">
      <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground mt-1 text-xs leading-5">
          {description}
        </p>
      </div>
    </div>
  )
}

function MetadataGrid({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
            {label.includes('ID') || label === 'Slug' ? (
              <CodeBracketIcon className="size-3.5" />
            ) : (
              <ShieldCheck className="size-3.5" />
            )}
            {label}
          </dt>
          <dd className="mt-1 truncate font-mono text-xs">{value || '-'}</dd>
        </div>
      ))}
    </dl>
  )
}
