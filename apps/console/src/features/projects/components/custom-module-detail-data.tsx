import Link from 'next/link'

import { RecordStatusBadge } from '@876/projects-ui/custom-modules/record-status-badge'
import { LayoutSummary } from '@876/projects-ui/layouts/layout-summary'
import { AppError } from '@876/ui/app-error'
import { Badge } from '@876/ui/badge'
import {
  DetailCardFact,
  DetailCardFacts,
  DetailCardSection,
} from '@876/ui/detail-card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'
import { notFound } from 'next/navigation'

import { projects } from '@/lib/services/projects'

import { formatOperatorDateOrDash } from './operator-format'

function moduleHref(base: string, moduleId: string): string {
  return `${base}/custom-modules/${encodeURIComponent(moduleId)}`
}

function formatScope(scope: 'org' | 'project'): string {
  return scope === 'org' ? 'Organization' : 'Project'
}

/**
 * The data half of the Custom module detail, shared by every host.
 * Read-only: the module definition (fields, statuses, access) plus the
 * resolved layout rendered through the shared `LayoutSummary`. No create,
 * edit, reorder, or delete affordances.
 */
export async function CustomModuleDetailData({
  organizationId,
  base,
  moduleId,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
  moduleId: string
}) {
  const decodedId = decodeURIComponent(moduleId)
  const moduleResult = await projects.customModules.retrieveModule(
    organizationId,
    decodedId
  )

  if (moduleResult.error?.code === 'projects/custom-module-not-found')
    notFound()

  if (moduleResult.error || !moduleResult.data) {
    return (
      <AppError
        title="Custom module could not be loaded"
        error={moduleResult.error}
        variant="banner"
        showCode
      />
    )
  }

  const customModule = moduleResult.data
  const [fieldsResult, statusesResult, layoutsResult, recordsResult] =
    await Promise.all([
      projects.customModules.listFields(organizationId, customModule.id),
      projects.customModules.listStatuses(organizationId, customModule.id),
      projects.layouts.list(organizationId, {
        entity: `custom-module:${customModule.key}`,
      }),
      projects.customModules.listRecords(organizationId, customModule.id, {
        limit: 1,
      }),
    ])

  const loadError =
    fieldsResult.error ??
    statusesResult.error ??
    layoutsResult.error ??
    recordsResult.error
  const fields = fieldsResult.data?.data ?? []
  const statuses = statusesResult.data?.data ?? []
  const layout = layoutsResult.data?.data[0] ?? null
  const recordCount = recordsResult.data?.total_count ?? 0

  const fieldLabels: Record<string, string> = {
    title: 'Title',
    status: 'Status',
  }
  for (const field of fields) {
    fieldLabels[field.key] = field.label
  }

  return (
    <div className="space-y-6">
      {loadError ? (
        <AppError
          title="Some custom module details could not be loaded"
          error={loadError}
          variant="banner"
          showCode
        />
      ) : null}
      <section className="876-card space-y-6 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-muted-foreground font-mono text-xs">
              {customModule.key}
            </p>
            <h2 className="mt-1 text-lg font-semibold">{customModule.pluralName}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Singular: {customModule.singularName}
            </p>
          </div>
          <Badge variant="secondary">{formatScope(customModule.scope)}</Badge>
        </div>
        <DetailCardSection title="Details">
          <DetailCardFacts>
            <DetailCardFact
              label="Project"
              value={customModule.projectId ?? 'Organization'}
            />
            <DetailCardFact label="Version" value={`v${customModule.version}`} />
            <DetailCardFact
              label="Records"
              value={
                <Link
                  className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                  href={`${moduleHref(base, customModule.id)}/records`}
                >
                  {`${recordCount} ${recordCount === 1 ? 'record' : 'records'}`}
                </Link>
              }
            />
            <DetailCardFact
              label="Updated"
              value={formatOperatorDateOrDash(customModule.updatedAt)}
            />
          </DetailCardFacts>
        </DetailCardSection>
        <DetailCardSection title="Access">
          {customModule.restrictedToRoleKeys.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Open to all internal callers.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {customModule.restrictedToRoleKeys.map((roleKey) => (
                <li key={roleKey}>
                  <Badge variant="info">{roleKey}</Badge>
                </li>
              ))}
            </ul>
          )}
        </DetailCardSection>
        <DetailCardSection title={`Fields (${fields.length})`}>
          {fields.length === 0 ? (
            <p className="text-muted-foreground text-sm">No fields yet.</p>
          ) : (
            <Table>
              <TableHeader className="876-header-row">
                <TableRow>
                  <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                    Label
                  </TableHead>
                  <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                    Key
                  </TableHead>
                  <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                    Type
                  </TableHead>
                  <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                    Required
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field) => (
                  <TableRow key={field.id}>
                    <TableCell className="px-5 py-4 text-[0.8125rem] font-medium">
                      {field.label}
                    </TableCell>
                    <TableCell className="text-muted-foreground px-5 py-4 font-mono text-xs">
                      {field.key}
                    </TableCell>
                    <TableCell className="text-muted-foreground px-5 py-4 font-mono text-xs">
                      {field.fieldType}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      {field.required ? (
                        <Badge variant="warning">Required</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          Optional
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DetailCardSection>
        <DetailCardSection title={`Statuses (${statuses.length})`}>
          {statuses.length === 0 ? (
            <p className="text-muted-foreground text-sm">No statuses yet.</p>
          ) : (
            <ul className="space-y-2">
              {statuses.map((status) => (
                <li
                  key={status.id}
                  className="flex flex-wrap items-center gap-2"
                >
                  <RecordStatusBadge
                    statusKey={status.key}
                    label={status.label}
                    category={status.category}
                  />
                  <span className="text-muted-foreground font-mono text-xs">
                    {status.key}
                  </span>
                  {status.isDefault ? (
                    <Badge variant="info">Default</Badge>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </DetailCardSection>
        <DetailCardSection title="Layout">
          {layout ? (
            <LayoutSummary layout={layout} fieldLabels={fieldLabels} />
          ) : (
            <p className="text-muted-foreground text-sm">
              No layout for this module yet.
            </p>
          )}
        </DetailCardSection>
      </section>
      <div className="flex flex-wrap gap-4">
        <Link
          href={`${moduleHref(base, customModule.id)}/records`}
          className="text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
        >
          View records
        </Link>
        <Link
          href={`${base}/custom-modules`}
          className="text-muted-foreground text-sm hover:underline"
        >
          Back to custom modules
        </Link>
      </div>
    </div>
  )
}
