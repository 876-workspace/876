'use client'

import { useMemo, useState, useTransition } from 'react'
import type {
  AdminProvisioningCatalog,
  AdminProvisioningManifest,
  AdminProvisioningManifestRevision,
  AdminProvisioningValidation,
} from '@876/admin'
import { Accordion } from '@876/ui/accordion'
import { Button } from '@876/ui/button'

import { client } from '@/lib/client'
import { FinanceResourceAccordion } from './finance-resource-accordion'
import {
  buildFinanceDraft,
  revisionRows,
  type FinanceResourceRow,
} from './finance-provisioning-utils'

export function FinanceProvisioningEditor({
  catalog,
  manifest: initialManifest,
  target = { type: 'finance', key: 'shared' },
  heading = 'Shared organization finance defaults',
  description = "These values initialize every new organization's shared financial data plane. Existing tenant overrides are preserved.",
}: {
  catalog: AdminProvisioningCatalog
  manifest: AdminProvisioningManifest | null
  target?: { type: 'finance' | 'application'; key: string }
  heading?: string
  description?: string
}) {
  const initialRevision =
    initialManifest?.draft ?? initialManifest?.published ?? null
  const [draftRevision, setDraftRevision] =
    useState<AdminProvisioningManifestRevision | null>(
      initialManifest?.draft ?? null
    )
  const [publishedRevision, setPublishedRevision] =
    useState<AdminProvisioningManifestRevision | null>(
      initialManifest?.published ?? null
    )
  const [rows, setRows] = useState<FinanceResourceRow[]>(() =>
    revisionRows(initialRevision)
  )
  const [issues, setIssues] = useState<AdminProvisioningValidation['issues']>(
    []
  )
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const currentRevision = draftRevision ?? publishedRevision

  const groupedRows = useMemo(
    () =>
      Object.fromEntries(
        catalog.resource_types.map((definition) => [
          definition.resource_type,
          rows.filter((row) => row.resourceType === definition.resource_type),
        ])
      ),
    [catalog.resource_types, rows]
  )

  function replaceType(resourceType: string, next: FinanceResourceRow[]) {
    setRows((current) => [
      ...current.filter((row) => row.resourceType !== resourceType),
      ...next,
    ])
  }

  async function replaceValidatedDraft(
    action: 'saving' | 'publishing'
  ): Promise<AdminProvisioningManifestRevision | null> {
    const draft = buildFinanceDraft(catalog, rows, currentRevision)
    const validation =
      target.type === 'finance'
        ? await client.financeProvisioning.validate(draft)
        : await client.provisioning.validate(target.key, draft)
    if (validation.error || !validation.data) {
      setMessage(
        validation.error?.message ??
          (action === 'saving'
            ? 'Failed to validate finance defaults.'
            : 'Validation failed.')
      )
      return null
    }
    if (!validation.data.valid) {
      setIssues(validation.data.issues)
      setMessage(
        `Resolve the validation issues before ${action === 'saving' ? 'saving' : 'publishing'}.`
      )
      return null
    }
    const saved =
      target.type === 'finance'
        ? await client.financeProvisioning.replaceDraft(draft)
        : await client.provisioning.replaceDraft(target.key, draft)
    if (saved.error || !saved.data) {
      setMessage(saved.error?.message ?? 'Failed to save finance defaults.')
      return null
    }
    return saved.data
  }

  function save() {
    setMessage(null)
    setIssues([])
    startTransition(async () => {
      const saved = await replaceValidatedDraft('saving')
      if (!saved) return
      setDraftRevision(saved)
      setRows(revisionRows(saved))
      setMessage(`Draft revision ${saved.revision} saved.`)
    })
  }

  function publish() {
    setMessage(null)
    setIssues([])
    startTransition(async () => {
      const saved = await replaceValidatedDraft('publishing')
      if (!saved) return
      const published =
        target.type === 'finance'
          ? await client.financeProvisioning.publish()
          : await client.provisioning.publish(target.key)
      if (published.error || !published.data) {
        setMessage(
          published.error?.message ?? 'Failed to publish finance defaults.'
        )
        return
      }
      setDraftRevision(null)
      setPublishedRevision(published.data)
      setRows(revisionRows(published.data))
      setMessage(
        `Revision ${published.data.revision} published for future organizations.`
      )
    })
  }

  return (
    <div className="space-y-5">
      <section className="876-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">{heading}</p>
            <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
              {description}
            </p>
          </div>
          <div className="text-right text-xs">
            <p>Manifest version 1</p>
            <p className="text-muted-foreground mt-1">
              Published revision {publishedRevision?.revision ?? 'none'}
              {draftRevision ? ` · draft ${draftRevision.revision}` : ''}
            </p>
          </div>
        </div>
      </section>

      <Accordion
        multiple
        defaultValue={catalog.resource_types
          .slice(0, 1)
          .map((definition) => definition.resource_type)}
        className="gap-3"
      >
        {catalog.resource_types.map((definition) => (
          <FinanceResourceAccordion
            key={definition.resource_type}
            definition={definition}
            rows={groupedRows[definition.resource_type] ?? []}
            allRows={rows}
            onChange={(next) => replaceType(definition.resource_type, next)}
          />
        ))}
      </Accordion>

      {issues.length > 0 && (
        <section className="border-destructive/40 bg-destructive/5 rounded-lg border p-4">
          <p className="text-sm font-medium">Validation issues</p>
          <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-sm">
            {issues.map((issue) => (
              <li key={`${issue.path}-${issue.code}`}>{issue.message}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm" role="status">
          {message}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" disabled={isPending} onClick={save}>
            Save draft
          </Button>
          <Button disabled={isPending} onClick={publish}>
            Validate and publish
          </Button>
        </div>
      </div>
    </div>
  )
}
