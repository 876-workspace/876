'use client'

import type { MemberCapacity } from '@876/projects'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { NativeSelect } from '@876/ui/native-select'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { reportsClient } from '@/lib/client/reports'
import { formatDateInput } from '@/lib/date-input'
import {
  formatMinutesAsHours,
  parseDateInput,
  parseHoursToMinutes,
} from '../capacity-input'

import type { CapacityMemberOption } from '@/types/reporting'

export type { CapacityMemberOption }

type Props =
  | { mode: 'create'; members: CapacityMemberOption[]; capacity?: never }
  | { mode: 'edit'; members: CapacityMemberOption[]; capacity: MemberCapacity }

const HOURS_ERROR: AppErrorValue = {
  code: 'projects/capacity-invalid-hours',
  message: 'Enter hours per week, up to 168.',
}

const START_ERROR: AppErrorValue = {
  code: 'projects/capacity-invalid-start',
  message: 'Enter the date this capacity starts.',
}

const END_ERROR: AppErrorValue = {
  code: 'projects/capacity-invalid-end',
  message: 'Enter a valid date for when this capacity ends.',
}

const RANGE_ERROR: AppErrorValue = {
  code: 'projects/capacity-invalid-range',
  message: 'The end date must be after the start date.',
}

function todayInput(): string {
  return formatDateInput(Math.floor(Date.now() / 1000))
}

export function CapacityForm(props: Props) {
  const router = useRouter()
  const editing = props.mode === 'edit'
  const record = props.mode === 'edit' ? props.capacity : null
  const { members } = props

  const [userId, setUserId] = useState(record?.userId ?? '')
  const [hours, setHours] = useState(
    formatMinutesAsHours(record?.minutesPerWeek)
  )
  const [effectiveFrom, setEffectiveFrom] = useState(
    record ? formatDateInput(record.effectiveFrom) : todayInput()
  )
  const [effectiveTo, setEffectiveTo] = useState(
    formatDateInput(record?.effectiveTo ?? null)
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  const memberLabel =
    record === null
      ? ''
      : (members.find((member) => member.id === record.userId)?.label ??
        record.userId)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    if (!editing && userId === '') {
      setError({
        code: 'projects/capacity-invalid-member',
        message: 'Choose the member this capacity applies to.',
      })
      return
    }

    const minutesPerWeek = parseHoursToMinutes(hours)
    if (minutesPerWeek === null) {
      setError(HOURS_ERROR)
      return
    }

    const start = parseDateInput(effectiveFrom)
    if (start === null) {
      setError(START_ERROR)
      return
    }

    const end = effectiveTo === '' ? null : parseDateInput(effectiveTo)
    if (end === null && effectiveTo !== '') {
      setError(END_ERROR)
      return
    }
    if (end !== null && end <= start) {
      setError(RANGE_ERROR)
      return
    }

    setPending(true)
    setError(null)

    const result =
      props.mode === 'edit'
        ? await reportsClient.updateCapacity(props.capacity.id, {
            minutesPerWeek,
            effectiveFrom: start,
            effectiveTo: end,
          })
        : await reportsClient.createCapacity({
            userId,
            minutesPerWeek,
            effectiveFrom: start,
            effectiveTo: end,
          })

    setPending(false)
    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/capacity-save-failed',
          message: 'The capacity could not be saved.',
        }
      )
      return
    }

    router.push('/settings/capacity')
  }

  return (
    <form
      onSubmit={onSubmit}
      className="876-card max-w-3xl space-y-5 p-6"
      aria-label={editing ? 'Edit capacity' : 'New capacity'}
    >
      {error ? (
        <AppError title="The capacity could not be saved" error={error} />
      ) : null}

      {editing ? (
        <FormRow label="Member">
          <p className="py-1.5 text-sm font-medium">{memberLabel}</p>
        </FormRow>
      ) : (
        <FormRow label="Member" htmlFor="capacity-member" required>
          <NativeSelect
            id="capacity-member"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            className="w-full"
          >
            <option value="">Choose a member</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.label}
              </option>
            ))}
          </NativeSelect>
        </FormRow>
      )}

      <FormRow label="Hours per week" htmlFor="capacity-hours" required>
        <Input
          id="capacity-hours"
          value={hours}
          onChange={(event) => setHours(event.target.value)}
          placeholder="40"
          inputMode="decimal"
        />
      </FormRow>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormRow label="Effective from" htmlFor="capacity-from" required>
          <Input
            id="capacity-from"
            type="date"
            value={effectiveFrom}
            onChange={(event) => setEffectiveFrom(event.target.value)}
          />
        </FormRow>
        <FormRow label="Effective to" htmlFor="capacity-to">
          <Input
            id="capacity-to"
            type="date"
            value={effectiveTo}
            onChange={(event) => setEffectiveTo(event.target.value)}
          />
        </FormRow>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" variant="info" disabled={pending}>
          {pending ? 'Saving…' : editing ? 'Save' : 'Add'}
        </Button>
      </div>
    </form>
  )
}
