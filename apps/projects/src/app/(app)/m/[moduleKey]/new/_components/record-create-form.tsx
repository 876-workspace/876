'use client'

import type {
  CustomModuleField,
  CustomModuleStatus,
  Layout,
} from '@876/projects/contracts'
import { LayoutRenderer } from '@876/projects-ui/layouts/layout-renderer'
import { RecordStatusBadge } from '@876/projects-ui/custom-modules/record-status-badge'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { customRecordsClient } from '@/lib/client'
import { defaultStatusKey } from '@/lib/custom-modules/module-access'
import {
  fallbackRecordLayout,
  toLayoutFieldDescriptors,
  toRecordFieldInputs,
} from '@/lib/custom-modules/record-form-helpers'

export function RecordCreateForm({
  moduleId,
  moduleKey,
  pluralName,
  projectId,
  fields,
  statuses,
  layout,
  cancelHref,
  successHrefBase,
}: {
  moduleId: string
  moduleKey: string
  pluralName: string
  projectId: string | null
  fields: readonly CustomModuleField[]
  statuses: readonly CustomModuleStatus[]
  layout: Layout | null
  cancelHref: string
  successHrefBase: string
}) {
  const router = useRouter()
  const [statusKey, setStatusKey] = useState(defaultStatusKey(statuses))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  const descriptors = toLayoutFieldDescriptors(fields)
  const effectiveLayout =
    layout ?? fallbackRecordLayout(moduleKey, descriptors.map((field) => field.fieldKey))

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const data = new FormData(event.currentTarget)
    const values: Record<string, string | string[] | null> = {}
    for (const field of descriptors) {
      const all = data.getAll(field.fieldKey).map(String)
      values[field.fieldKey] =
        all.length === 0 ? null : field.control.kind === 'multi-select' ? all : (all[0] ?? null)
    }
    const { title, fields: fieldInputs } = toRecordFieldInputs(values)
    if (title.trim() === '') {
      setError({
        code: 'projects/custom-record-invalid',
        message: 'Give the record a title.',
      })
      return
    }

    setPending(true)
    setError(null)
    const result = await customRecordsClient.create(moduleId, {
      ...(projectId ? { projectId } : {}),
      title: title.trim(),
      statusKey,
      fields: fieldInputs,
    })
    setPending(false)
    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/custom-record-save-failed',
          message: 'The record could not be created.',
        }
      )
      return
    }

    router.push(`${successHrefBase}/${encodeURIComponent(result.data.id)}`)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
      {error ? (
        <AppError title={`${pluralName} record not created`} error={error} variant="banner" />
      ) : null}
      <div className="max-w-2xl">
        <FormRow label="Status" htmlFor="record-status">
          <div className="flex items-center gap-3">
            <NativeSelect
              id="record-status"
              value={statusKey}
              onChange={(event) => setStatusKey(event.target.value)}
            >
              {statuses.map((status) => (
                <NativeSelectOption key={status.key} value={status.key}>
                  {status.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <RecordStatusBadge statusKey={statusKey} statuses={statuses} />
          </div>
        </FormRow>
      </div>
      <LayoutRenderer layout={effectiveLayout} fields={descriptors} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create record'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push(cancelHref)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
