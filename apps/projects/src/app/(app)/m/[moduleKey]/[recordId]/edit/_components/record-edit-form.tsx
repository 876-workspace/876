'use client'

import type {
  CustomModuleField,
  CustomModuleStatus,
  CustomRecord,
  Layout,
} from '@876/projects/contracts'
import { LayoutRenderer } from '@876/projects-ui/layouts/layout-renderer'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { customRecordsClient } from '@/lib/client'
import {
  fallbackRecordLayout,
  recordInitialValues,
  toLayoutFieldDescriptors,
  toRecordFieldInputs,
} from '@/lib/custom-modules/record-form-helpers'

export function RecordEditForm({
  moduleId,
  moduleKey,
  record,
  fields,
  statuses,
  layout,
  cancelHref,
}: {
  moduleId: string
  moduleKey: string
  record: CustomRecord
  fields: readonly CustomModuleField[]
  statuses: readonly CustomModuleStatus[]
  layout: Layout | null
  cancelHref: string
}) {
  const router = useRouter()
  const [statusKey, setStatusKey] = useState(record.statusKey)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)
  const [saved, setSaved] = useState(false)

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
    setSaved(false)
    const result = await customRecordsClient.update(moduleId, record.id, {
      title: title.trim(),
      statusKey,
      fields: fieldInputs,
    })
    setPending(false)
    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/custom-record-save-failed',
          message: 'The record could not be updated.',
        }
      )
      return
    }
    setSaved(true)
    router.refresh()
  }

  async function onDelete() {
    if (pending) return
    setPending(true)
    setError(null)
    const result = await customRecordsClient.remove(moduleId, record.id)
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.push(cancelHref)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
      {error ? <AppError title="Record not updated" error={error} variant="banner" /> : null}
      {saved ? <p className="text-sm text-emerald-600">Record saved.</p> : null}
      <div className="max-w-2xl">
        <FormRow label="Status" htmlFor="record-status">
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
        </FormRow>
      </div>
      <LayoutRenderer layout={effectiveLayout} fields={descriptors} values={recordInitialValues(record)} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save record'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push(cancelHref)}>
          Cancel
        </Button>
        <Button type="button" variant="ghost" onClick={onDelete} disabled={pending}>
          Delete
        </Button>
      </div>
    </form>
  )
}
