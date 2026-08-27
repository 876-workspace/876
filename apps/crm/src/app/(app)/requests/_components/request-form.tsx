'use client'

import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'
import { Textarea } from '@876/ui/textarea'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { client } from '@/lib/client'
import type {
  CrmCustomer,
  RequestCategory,
  RequestPriority,
  RequestSource,
  RequestStatus,
} from '@/types/crm'

import {
  CustomerPicker,
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
  category: RequestCategory
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
  category: 'GENERAL',
  status: 'OPEN',
  priority: 'NORMAL',
  source: 'CRM',
  teamId: '',
  assigneeId: '',
}

const rowClassName = 'sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3'

export function RequestForm({
  customers,
  departments = [],
  members = [],
  requestId,
  initial = EMPTY,
}: {
  customers: CrmCustomer[]
  departments?: FormDepartment[]
  members?: FormMember[]
  requestId?: string
  initial?: Values
}) {
  const router = useRouter()
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

    const base = {
      subject: values.subject.trim(),
      category: values.category,
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
          description: values.description.trim() || null,
        })

    if (result.error) {
      setError(result.error.message)
      setSaving(false)
      return
    }

    router.replace(`/requests/${result.data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-6">
      <div className="876-card space-y-5 p-5">
        <FormRow label="Customer" required className={rowClassName}>
          <CustomerPicker
            customers={pickerCustomers}
            value={customer}
            onSelect={chooseCustomer}
            disabled={saving}
            locked={Boolean(requestId)}
          />
        </FormRow>

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
            htmlFor="request-description"
            label="Description"
            hint="The opening message. It is filed as the first note on this request; everything added afterwards is a note too."
            className={rowClassName}
          >
            <Textarea
              id="request-description"
              className="min-h-32"
              value={values.description}
              onChange={(event) => set('description', event.target.value)}
              placeholder="What did the customer ask for?"
              disabled={saving}
            />
          </FormRow>
        )}

        <FormRow label="Category" className={rowClassName}>
          <RequestSelect
            value={values.category}
            options={[
              'GENERAL',
              'SUPPORT',
              'BILLING',
              'SALES',
              'COMPLAINT',
              'FEEDBACK',
              'OTHER',
            ]}
            onValueChange={(value) => set('category', value as RequestCategory)}
            disabled={saving}
          />
        </FormRow>

        <FormRow label="Priority" className={rowClassName}>
          <RequestSelect
            value={values.priority}
            options={['LOW', 'NORMAL', 'HIGH', 'URGENT']}
            onValueChange={(value) => set('priority', value as RequestPriority)}
            disabled={saving}
          />
        </FormRow>

        <FormRow label="Source" className={rowClassName}>
          <RequestSelect
            value={values.source}
            options={['CRM', 'EMAIL', 'PHONE', 'CHAT', 'WEB', 'API', 'OTHER']}
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
              onValueChange={(value) => set('status', value as RequestStatus)}
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
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button type="submit" variant="info" disabled={saving}>
          {requestId ? 'Save' : 'Add'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={saving}
        >
          Cancel
        </Button>
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
