'use client'

import { useState, useTransition } from 'react'
import { AppError } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import {
  DetailCard,
  DetailCardBody,
  DetailCardFooter,
  DetailCardHeader,
  DetailCardSection,
} from '@876/ui/detail-card'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { Textarea } from '@876/ui/textarea'

import { PermissionMatrixPanel } from './permission-matrix-panel'
import type {
  FinanceActionResult,
  FinancePermissionKey,
  FinancePermissionSurface,
} from './types'

type Props = {
  surface: FinancePermissionSurface
  closeHref: string
  onCreate: (params: {
    name: string
    slug: string
    description: string
    permissions: string[]
  }) => Promise<FinanceActionResult>
}

function slugFor(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50)
}

export function RoleFormPanel({ surface, closeHref, onCreate }: Props) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState<FinancePermissionKey[]>([
    'billing:access',
  ])
  const [error, setError] = useState<FinanceActionResult['error']>(null)
  const [pending, startTransition] = useTransition()
  const slugValid = /^[a-z0-9_]{2,50}$/.test(slug)

  function changeName(value: string) {
    setName(value)
    if (!slugEdited) setSlug(slugFor(value))
  }

  function submit(event?: React.FormEvent<HTMLFormElement>) {
    if (event) event.preventDefault()
    if (!name.trim() || !slugValid) return
    setError(null)
    startTransition(async () => {
      const result = await onCreate({
        name: name.trim(),
        slug,
        description: description.trim(),
        permissions,
      })
      if (result.error) setError(result.error)
    })
  }

  return (
    <DetailCard aria-label="Create role">
      <DetailCardHeader
        title="New role"
        closeHref={closeHref}
        closeLabel="Close role form"
      />
      <form
        id="role-create-form"
        onSubmit={submit}
        noValidate
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <DetailCardBody className="space-y-6">
          {error ? <AppError error={error} variant="form" showCode /> : null}
          <div className="space-y-4">
            <FormRow htmlFor="new-role-name" label="Name" required>
              <Input
                id="new-role-name"
                placeholder="e.g. Billing Specialist"
                value={name}
                autoFocus
                onChange={(event) => changeName(event.target.value)}
              />
            </FormRow>
            <FormRow
              htmlFor="new-role-slug"
              label="Slug"
              required
              hint="Lowercase letters, digits, and underscores; 2–50 characters."
            >
              <Input
                id="new-role-slug"
                placeholder="e.g. billing_specialist"
                value={slug}
                pattern="[a-z0-9_]{2,50}"
                aria-invalid={slug.length > 0 && !slugValid}
                onChange={(event) => {
                  setSlugEdited(true)
                  setSlug(event.target.value.toLowerCase())
                }}
              />
            </FormRow>
            <FormRow htmlFor="new-role-description" label="Description">
              <Textarea
                id="new-role-description"
                placeholder="Briefly describe what this role can do..."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </FormRow>
          </div>
          <DetailCardSection title="Permissions">
            <PermissionMatrixPanel
              surface={surface}
              selected={permissions}
              onChange={setPermissions}
            />
          </DetailCardSection>
        </DetailCardBody>
        <DetailCardFooter>
          <Button
            type="submit"
            variant="info"
            disabled={pending || !name.trim() || !slugValid}
          >
            {pending ? 'Creating…' : 'Create'}
          </Button>
        </DetailCardFooter>
      </form>
    </DetailCard>
  )
}
