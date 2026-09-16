'use client'

import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { customModulesClient } from '@/lib/client'
import { keyFromName } from '@/lib/custom-modules/module-access'

const ICON_OPTIONS = ['forms', 'projects', 'issues', 'labels', 'members', 'reports', 'settings']

export function CustomModuleCreateForm() {
  const router = useRouter()
  const [singularName, setSingularName] = useState('')
  const [pluralName, setPluralName] = useState('')
  const [key, setKey] = useState('')
  const [scope, setScope] = useState<'org' | 'project'>('org')
  const [icon, setIcon] = useState('forms')
  const [roleKeys, setRoleKeys] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const resolvedKey = keyFromName(key || pluralName)
    if (!singularName.trim() || !pluralName.trim() || !resolvedKey) {
      setError({
        code: 'projects/custom-module-invalid',
        message: 'Give the module singular and plural names.',
      })
      return
    }

    setPending(true)
    setError(null)
    const restrictedToRoleKeys = roleKeys
      .split('\n')
      .map((entry) => entry.trim())
      .filter((entry) => entry !== '')
    const result = await customModulesClient.create({
      scope,
      key: resolvedKey,
      singularName: singularName.trim(),
      pluralName: pluralName.trim(),
      icon,
      ...(restrictedToRoleKeys.length > 0 ? { restrictedToRoleKeys } : {}),
    })
    setPending(false)
    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/custom-module-save-failed',
          message: 'The custom module could not be created.',
        }
      )
      return
    }

    router.push(`/settings/custom-modules/${encodeURIComponent(result.data.id)}`)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-5">
      {error ? <AppError title="Module not created" error={error} variant="banner" /> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <FormRow label="Singular name" htmlFor="module-singular" required>
          <Input
            id="module-singular"
            value={singularName}
            onChange={(event) => setSingularName(event.target.value)}
            placeholder="Risk"
            autoFocus
          />
        </FormRow>
        <FormRow label="Plural name" htmlFor="module-plural" required>
          <Input
            id="module-plural"
            value={pluralName}
            onChange={(event) => setPluralName(event.target.value)}
            placeholder="Risks"
          />
        </FormRow>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormRow label="Key" htmlFor="module-key" hint="Kebab-case, used in URLs and layouts.">
          <Input
            id="module-key"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder={keyFromName(pluralName) || 'risks'}
          />
        </FormRow>
        <FormRow label="Scope" htmlFor="module-scope">
          <NativeSelect
            id="module-scope"
            value={scope}
            onChange={(event) => setScope(event.target.value as 'org' | 'project')}
          >
            <NativeSelectOption value="org">Organization</NativeSelectOption>
            <NativeSelectOption value="project">Project</NativeSelectOption>
          </NativeSelect>
        </FormRow>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormRow label="Icon" htmlFor="module-icon">
          <NativeSelect id="module-icon" value={icon} onChange={(event) => setIcon(event.target.value)}>
            {ICON_OPTIONS.map((option) => (
              <NativeSelectOption key={option} value={option}>
                {option}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormRow>
        <FormRow
          label="Restricted role keys"
          htmlFor="module-roles"
          hint="One per line. Empty means every viewer may use the module."
        >
          <Textarea
            id="module-roles"
            value={roleKeys}
            onChange={(event) => setRoleKeys(event.target.value)}
            placeholder={'admin\nmanager'}
            rows={3}
          />
        </FormRow>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Creating…' : 'Create module'}
      </Button>
    </form>
  )
}
