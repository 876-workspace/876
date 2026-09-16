'use client'

import type { CustomModule } from '@876/projects/contracts'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { Textarea } from '@876/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { customModulesClient } from '@/lib/client'

export function CustomModuleAccessForm({ module }: { module: CustomModule }) {
  const router = useRouter()
  const [singularName, setSingularName] = useState(module.singularName)
  const [pluralName, setPluralName] = useState(module.pluralName)
  const [icon, setIcon] = useState(module.icon ?? '')
  const [roleKeys, setRoleKeys] = useState(module.restrictedToRoleKeys.join('\n'))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)
  const [saved, setSaved] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    setPending(true)
    setError(null)
    setSaved(false)
    const restrictedToRoleKeys = roleKeys
      .split('\n')
      .map((entry) => entry.trim())
      .filter((entry) => entry !== '')
    const result = await customModulesClient.update(module.id, {
      ...(singularName.trim() !== module.singularName ? { singularName: singularName.trim() } : {}),
      ...(pluralName.trim() !== module.pluralName ? { pluralName: pluralName.trim() } : {}),
      ...(icon.trim() !== (module.icon ?? '') ? { icon: icon.trim() === '' ? null : icon.trim() } : {}),
      restrictedToRoleKeys,
    })
    setPending(false)
    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/custom-module-save-failed',
          message: 'The module could not be updated.',
        }
      )
      return
    }
    setSaved(true)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-5">
      {error ? <AppError title="Module not updated" error={error} variant="banner" /> : null}
      {saved ? <p className="text-sm text-emerald-600">Module updated.</p> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <FormRow label="Singular name" htmlFor="module-access-singular">
          <Input
            id="module-access-singular"
            value={singularName}
            onChange={(event) => setSingularName(event.target.value)}
          />
        </FormRow>
        <FormRow label="Plural name" htmlFor="module-access-plural">
          <Input
            id="module-access-plural"
            value={pluralName}
            onChange={(event) => setPluralName(event.target.value)}
          />
        </FormRow>
      </div>
      <FormRow label="Icon key" htmlFor="module-access-icon">
        <Input
          id="module-access-icon"
          value={icon}
          onChange={(event) => setIcon(event.target.value)}
          placeholder="forms"
        />
      </FormRow>
      <FormRow
        label="Restricted role keys"
        htmlFor="module-access-roles"
        hint="One per line. Empty means every viewer may use the module."
      >
        <Textarea
          id="module-access-roles"
          value={roleKeys}
          onChange={(event) => setRoleKeys(event.target.value)}
          rows={4}
          placeholder={'admin\nmanager'}
        />
      </FormRow>
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save module'}
      </Button>
    </form>
  )
}
