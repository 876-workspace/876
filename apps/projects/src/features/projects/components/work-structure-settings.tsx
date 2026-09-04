'use client'

import type {
  CustomField,
  Milestone,
  Project,
  WorkItemType,
  WorkflowState,
} from '@876/projects/contracts'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { NativeSelect } from '@876/ui/native-select'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import {
  customFieldsClient,
  milestonesClient,
  workItemTypesClient,
  workflowStatesClient,
} from '@/lib/client'

type Props =
  | { kind: 'work-item-types'; items: WorkItemType[] }
  | { kind: 'workflow-states'; items: WorkflowState[] }
  | { kind: 'milestones'; items: Milestone[]; projects: Project[] }
  | {
      kind: 'custom-fields'
      items: CustomField[]
      workItemTypes: WorkItemType[]
    }

function keyFromName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function SettingsError({ error }: { error: AppErrorValue | null }) {
  return error ? (
    <AppError title="Settings not saved" error={error} variant="banner" />
  ) : null
}

export function WorkStructureSettings(props: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [color, setColor] = useState('#6b7280')
  const [extra, setExtra] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  const title = {
    'work-item-types': 'Work item types',
    'workflow-states': 'Workflow states',
    milestones: 'Milestones',
    'custom-fields': 'Custom fields',
  }[props.kind]

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !keyFromName(key || name) || pending) return
    setPending(true)
    setError(null)
    const resourceKey = keyFromName(key || name)
    let result
    if (props.kind === 'work-item-types') {
      result = await workItemTypesClient.create({
        key: resourceKey,
        name: name.trim(),
        iconKey: 'circle',
        color,
      })
    } else if (props.kind === 'workflow-states') {
      result = await workflowStatesClient.create({
        key: resourceKey,
        name: name.trim(),
        category: 'unstarted',
        color,
      })
    } else if (props.kind === 'milestones') {
      result = await milestonesClient.create({
        key: resourceKey,
        name: name.trim(),
        projectId: extra,
      })
    } else {
      const fieldType = extra as
        | 'text'
        | 'textarea'
        | 'number'
        | 'decimal'
        | 'boolean'
        | 'date'
        | 'select'
        | 'multi-select'
        | 'user'
        | 'url'
      result = await customFieldsClient.create({
        key: resourceKey,
        label: name.trim(),
        fieldType,
      })
    }
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setName('')
    setKey('')
    router.refresh()
  }

  async function remove(id: string) {
    if (pending) return
    setPending(true)
    setError(null)
    const result =
      props.kind === 'work-item-types'
        ? await workItemTypesClient.delete(id)
        : props.kind === 'workflow-states'
          ? await workflowStatesClient.delete(id)
          : props.kind === 'milestones'
            ? await milestonesClient.delete(id)
            : await customFieldsClient.delete(id)
    setPending(false)
    if (result.error) setError(result.error)
    else router.refresh()
  }

  return (
    <div className="space-y-6">
      <SettingsError error={error} />
      <form
        onSubmit={onSubmit}
        className="max-w-2xl space-y-3 rounded-lg border p-4"
      >
        <h2 className="text-sm font-semibold">
          Add {title.toLowerCase().replace(/s$/, '')}
        </h2>
        <FormRow label="Name" htmlFor="name" required>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </FormRow>
        <FormRow label="Key" htmlFor="key">
          <Input
            id="key"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder={keyFromName(name) || 'auto-generated'}
          />
        </FormRow>
        {props.kind === 'milestones' ? (
          <FormRow label="Project" htmlFor="project" required>
            <NativeSelect
              id="project"
              value={extra}
              onChange={(event) => setExtra(event.target.value)}
              className="w-full"
            >
              <option value="">Select a project…</option>
              {props.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </NativeSelect>
          </FormRow>
        ) : props.kind === 'custom-fields' ? (
          <FormRow label="Field type" htmlFor="field-type" required>
            <NativeSelect
              id="field-type"
              value={extra || 'text'}
              onChange={(event) => setExtra(event.target.value)}
              className="w-full"
            >
              {[
                'text',
                'textarea',
                'number',
                'decimal',
                'boolean',
                'date',
                'select',
                'multi-select',
                'user',
                'url',
              ].map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </NativeSelect>
          </FormRow>
        ) : (
          <FormRow label="Color" htmlFor="color">
            <Input
              id="color"
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-9 w-16"
            />
          </FormRow>
        )}
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="info"
            disabled={
              !name.trim() || pending || (props.kind === 'milestones' && !extra)
            }
          >
            {pending ? 'Saving…' : 'Add'}
          </Button>
        </div>
      </form>
      <div className="divide-y rounded-lg border">
        {props.items.length === 0 ? (
          <p className="text-muted-foreground p-4 text-sm">
            No {title.toLowerCase()} yet.
          </p>
        ) : (
          props.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 p-4"
            >
              <div>
                <p className="font-medium">
                  {'label' in item ? item.label : item.name}
                </p>
                <p className="text-muted-foreground text-xs">{item.key}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending || ('isDefault' in item && item.isDefault)}
                onClick={() => remove(item.id)}
              >
                Remove
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
