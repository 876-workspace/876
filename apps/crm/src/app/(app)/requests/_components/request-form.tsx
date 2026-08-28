'use client'

import { isEditorContentEmpty } from '@876/editor'
import { Editor, type EditorHandle } from '@876/editor/react'
import { Button } from '@876/ui/button'
import { CategoryIcon } from '@876/ui/category-icons'
import { FormRow } from '@876/ui/form-row'
import { InformationCircleIcon } from '@876/ui/icons'
import { Input } from '@876/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'

import { categoryColorClass } from '@/features/categories/category-color'
import { client } from '@/lib/client'
import type {
  CrmCustomer,
  CrmRequestCategory,
  RequestPriority,
  RequestSource,
  RequestStatus,
} from '@/types/crm'

import {
  CustomerPicker,
  CustomerSelectionCard,
  toPickerCustomer,
  type PickerCustomer,
} from './customer-picker'

export type FormDepartment = {
  id: string
  name: string
}

export type FormMember = {
  userId: string
  name: string
  email: string | null
}

type Values = {
  customerId: string
  subject: string
  /**
   * The opening message. On create this becomes the request's first note
   * (`kind: 'DESCRIPTION'`); a request itself no longer stores a description,
   * so this field is absent when editing.
   */
  description: string
  /**
   * The chosen category, or `''` for none. Optional at the database level and
   * therefore optional here — the UI may require it later, the schema does not.
   */
  categoryId: string
  status: RequestStatus
  priority: RequestPriority
  source: RequestSource
  teamId: string
  assigneeId: string
}

const EMPTY: Values = {
  customerId: '',
  subject: '',
  description: '',
  categoryId: '',
  status: 'OPEN',
  priority: 'NORMAL',
  source: 'CRM',
  teamId: '',
  assigneeId: '',
}

const rowClassName = 'sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3'

export function RequestForm({
  customers,
  categories = [],
  departments = [],
  members = [],
  requestId,
  initial = EMPTY,
}: {
  customers: CrmCustomer[]
  /** The org's active request categories. Empty is a valid, working state. */
  categories?: CrmRequestCategory[]
  departments?: FormDepartment[]
  members?: FormMember[]
  requestId?: string
  initial?: Values
}) {
  const router = useRouter()
  const descriptionEditorRef = useRef<EditorHandle>(null)
  const [values, setValues] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pickerCustomers = useMemo(
    () => customers.map(toPickerCustomer),
    [customers]
  )
  const [customer, setCustomer] = useState<PickerCustomer | null>(
    () =>
      pickerCustomers.find((entry) => entry.id === initial.customerId) ?? null
  )

  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  function chooseCustomer(next: PickerCustomer | null) {
    setCustomer(next)
    set('customerId', next?.id ?? '')
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    if (!requestId && !values.customerId) {
      setError('Select the customer this request is for.')
      return
    }

    setSaving(true)
    setError(null)

    const description = requestId
      ? values.description
      : ((await descriptionEditorRef.current?.flush()) ?? values.description)
    const base = {
      subject: values.subject.trim(),
      categoryId: values.categoryId || null,
      priority: values.priority,
      source: values.source,
      teamId: values.teamId.trim() || null,
      assigneeId: values.assigneeId.trim() || null,
    }

    const result = requestId
      ? await client.requests.update(requestId, {
          ...base,
          status: values.status,
        })
      : await client.requests.create({
          ...base,
          customerId: values.customerId,
          description: isEditorContentEmpty(description) ? null : description,
        })

    if (result.error) {
      setError(result.error.message)
      setSaving(false)
      return
    }

    router.replace(`/requests/${result.data.id}`)
    router.refresh()
  }

  const creating = !requestId

  return (
    <form onSubmit={submit}>
      {/*
        Creating and editing are different jobs. Creating is "who is this for,
        and what do they need", so the customer gets its own column and the
        form is not submittable until one is chosen. Editing cannot change the
        customer at all, so the record stays a single column and the locked
        picker sits inline as a reminder of whose request this is.
      */}
      <div
        className={
          creating
            ? 'grid max-w-6xl items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]'
            : 'max-w-3xl'
        }
      >
        <div className="876-card min-w-0 overflow-hidden">
          <div className="bg-muted/20 border-b px-5 py-3.5">
            <h2 className="876-section-title">Request details</h2>
          </div>

          <div className="space-y-5 p-5">
            {creating ? null : (
              <FormRow label="Customer" required className={rowClassName}>
                <CustomerPicker
                  customers={pickerCustomers}
                  value={customer}
                  onSelect={chooseCustomer}
                  disabled={saving}
                  locked
                />
              </FormRow>
            )}

            <FormRow
              htmlFor="request-subject"
              label="Subject"
              required
              className={rowClassName}
            >
              <Input
                id="request-subject"
                value={values.subject}
                onChange={(event) => set('subject', event.target.value)}
                placeholder="What is this request about?"
                disabled={saving}
                required
              />
            </FormRow>

            {requestId ? null : (
              <FormRow
                label="Description"
                hint="The opening message. It is filed as the first note on this request; everything added afterwards is a note too."
                className={rowClassName}
              >
                <Editor
                  ref={descriptionEditorRef}
                  id="request-description"
                  initialValue={values.description}
                  onChange={(value) => set('description', value)}
                  placeholder="What did the customer ask for?"
                  ariaLabel="Request description"
                  disabled={saving}
                  minHeight={180}
                  className="border-input bg-background focus-within:border-ring focus-within:ring-ring/50 rounded-md border px-3 py-2 shadow-xs focus-within:ring-[3px]"
                />
              </FormRow>
            )}

            <FormRow label="Category" className={rowClassName}>
              {/*
            Categories are org-managed, so the options come from the workspace's
            own catalog rather than a hard-coded enum. Only active categories are
            offered for new selections; an archived one already on a request is
            preserved by the API and still renders elsewhere.
          */}
              <Select
                value={values.categoryId || 'none'}
                onValueChange={(value) =>
                  set('categoryId', value === 'none' ? '' : (value ?? ''))
                }
                disabled={saving || categories.length === 0}
              >
                <SelectTrigger aria-label="Category">
                  <SelectValue placeholder="No category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <CategoryIcon
                        name={category.icon}
                        className={`size-4 ${categoryColorClass(category.color)}`}
                      />
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>

            <FormRow label="Priority" className={rowClassName}>
              <RequestSelect
                value={values.priority}
                options={['LOW', 'NORMAL', 'HIGH', 'URGENT']}
                onValueChange={(value) =>
                  set('priority', value as RequestPriority)
                }
                disabled={saving}
              />
            </FormRow>

            <FormRow label="Source" className={rowClassName}>
              <RequestSelect
                value={values.source}
                options={[
                  'CRM',
                  'EMAIL',
                  'PHONE',
                  'CHAT',
                  'WEB',
                  'API',
                  'OTHER',
                ]}
                onValueChange={(value) => set('source', value as RequestSource)}
                disabled={saving}
              />
            </FormRow>

            {requestId ? (
              <FormRow label="Status" className={rowClassName}>
                <RequestSelect
                  value={values.status}
                  options={[
                    'OPEN',
                    'IN_PROGRESS',
                    'WAITING',
                    'RESOLVED',
                    'CLOSED',
                    'CANCELLED',
                  ]}
                  onValueChange={(value) =>
                    set('status', value as RequestStatus)
                  }
                  disabled={saving}
                />
              </FormRow>
            ) : null}

            <FormRow
              htmlFor="request-team"
              label="Team"
              hint="Optional department or team queue responsible for this request."
              className={rowClassName}
            >
              {departments.length > 0 ? (
                <Select
                  value={values.teamId || 'none'}
                  onValueChange={(val) =>
                    set('teamId', val === 'none' ? '' : (val ?? ''))
                  }
                  disabled={saving}
                >
                  <SelectTrigger id="request-team">
                    <SelectValue placeholder="No team assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No team assigned</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="request-team"
                  value={values.teamId}
                  onChange={(event) => set('teamId', event.target.value)}
                  placeholder="Team ID (optional)"
                  disabled={saving}
                />
              )}
            </FormRow>

            <FormRow
              htmlFor="request-assignee"
              label="Assignee"
              hint="Optional individual team member assigned to handle this request."
              className={rowClassName}
            >
              {members.length > 0 ? (
                <Select
                  value={values.assigneeId || 'none'}
                  onValueChange={(val) =>
                    set('assigneeId', val === 'none' ? '' : (val ?? ''))
                  }
                  disabled={saving}
                >
                  <SelectTrigger id="request-assignee">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.userId} value={member.userId}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="request-assignee"
                  value={values.assigneeId}
                  onChange={(event) => set('assigneeId', event.target.value)}
                  placeholder="Assignee user ID (optional)"
                  disabled={saving}
                />
              )}
            </FormRow>
          </div>

          {error ? (
            <p
              className="text-destructive border-t px-5 py-3 text-sm"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="bg-muted/10 flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <InformationCircleIcon className="size-3.5 shrink-0" />
              {creating
                ? 'The request opens in its record after saving.'
                : 'Changes apply to this request only.'}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="info"
                disabled={saving || (creating && !values.customerId)}
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>

        {creating ? (
          <aside className="min-w-0 lg:sticky lg:top-6">
            <CustomerSelectionCard
              customers={pickerCustomers}
              value={customer}
              onSelect={chooseCustomer}
              disabled={saving}
            />
          </aside>
        ) : null}
      </div>
    </form>
  )
}

function RequestSelect({
  value,
  options,
  onValueChange,
  disabled,
}: {
  value: string
  options: readonly string[]
  onValueChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onValueChange(next ?? value)}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option.replaceAll('_', ' ')}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export type { Values as RequestFormValues }
