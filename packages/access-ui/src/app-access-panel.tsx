'use client'

import { useEffect, useState } from 'react'
import { AppError } from '@876/ui/app-error'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { Checkbox } from '@876/ui/checkbox'
import { Empty, EmptyHeader, EmptyTitle } from '@876/ui/empty'
import { FormRow } from '@876/ui/form-row'
import { Label } from '@876/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'

import { EffectivePermissionList } from './effective-permissions'
import type { AccessAppEntry, AccessPermission } from './types'

type OverrideChange = { grants: string[]; denies: string[] }

type Props = {
  entries: AccessAppEntry[]
  /** Called when the operator picks a role. Resolves to an error message, or null. */
  onRoleChange?: (
    entry: AccessAppEntry,
    roleId: string
  ) => Promise<string | null>
  /** Called when a permission override is toggled. */
  onOverrideChange?: (
    entry: AccessAppEntry,
    next: OverrideChange
  ) => Promise<string | null>
  /** Read-only when the viewer lacks the manage permission. */
  readOnly?: boolean
}

type PermissionGroup = {
  key: string
  label: string
  permissions: AccessPermission[]
}

function groupCatalog(catalog: readonly AccessPermission[]): PermissionGroup[] {
  const groups = new Map<string, PermissionGroup>()

  for (const permission of catalog) {
    const group = groups.get(permission.moduleKey)
    if (group) {
      group.permissions.push(permission)
      continue
    }

    groups.set(permission.moduleKey, {
      key: permission.moduleKey,
      label: permission.moduleLabel,
      permissions: [permission],
    })
  }

  return [...groups.values()]
}

function nextOverride(
  entry: AccessAppEntry,
  permission: AccessPermission
): OverrideChange {
  const grants = new Set(entry.grants.filter((key) => key !== permission.key))
  const denies = new Set(entry.denies.filter((key) => key !== permission.key))

  if (entry.grants.includes(permission.key))
    return { grants: [...grants], denies: [...denies] }
  if (entry.denies.includes(permission.key))
    return { grants: [...grants], denies: [...denies] }

  if (entry.role?.permissions.includes(permission.key))
    denies.add(permission.key)
  else grants.add(permission.key)

  return { grants: [...grants], denies: [...denies] }
}

function permissionState(entry: AccessAppEntry, permission: AccessPermission) {
  if (entry.denies.includes(permission.key)) return 'denied'
  if (entry.grants.includes(permission.key)) return 'granted'
  if (entry.role?.permissions.includes(permission.key)) return 'from role'
  return 'not granted'
}

function AppAccessEntryPanel({
  entry,
  onRoleChange,
  onOverrideChange,
  readOnly,
}: {
  entry: AccessAppEntry
  onRoleChange?: Props['onRoleChange']
  onOverrideChange?: Props['onOverrideChange']
  readOnly: boolean
}) {
  const [current, setCurrent] = useState(entry)
  const [roleId, setRoleId] = useState(entry.role?.id ?? '')
  const [roleSaving, setRoleSaving] = useState(false)
  const [overrideSaving, setOverrideSaving] = useState<string | null>(null)
  const [roleError, setRoleError] = useState<string | null>(null)
  const [overrideErrors, setOverrideErrors] = useState<Record<string, string>>(
    {}
  )

  useEffect(() => {
    setCurrent(entry)
    setRoleId(entry.role?.id ?? '')
    setRoleError(null)
    setOverrideErrors({})
  }, [entry])

  const selectedRole = current.roles.find((role) => role.id === roleId) ?? null

  async function changeRole(nextRoleId: string) {
    if (readOnly || roleSaving || !onRoleChange) return

    setRoleId(nextRoleId)
    setCurrent((value) => ({
      ...value,
      assigned: true,
      role: value.roles.find((role) => role.id === nextRoleId) ?? null,
    }))
    setRoleSaving(true)
    setRoleError(null)
    const error = await onRoleChange(entry, nextRoleId)
    setRoleSaving(false)
    if (error) setRoleError(error)
  }

  async function changeOverride(permission: AccessPermission) {
    if (readOnly || overrideSaving || !onOverrideChange) return

    const next = nextOverride(current, permission)

    setOverrideSaving(permission.key)
    setOverrideErrors((current) => {
      const { [permission.key]: _removed, ...rest } = current
      return rest
    })
    setCurrent((value) => ({
      ...value,
      grants: next.grants,
      denies: next.denies,
    }))
    const error = await onOverrideChange(entry, next)
    setOverrideSaving(null)
    if (error) {
      setOverrideErrors((current) => ({ ...current, [permission.key]: error }))
      return
    }
  }

  const isUnassigned = !current.assigned

  return (
    <section
      className="space-y-4 rounded-lg border p-4"
      aria-labelledby={`${current.appId}-heading`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={`${current.appId}-heading`} className="font-medium">
            {current.appName}
          </h3>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {current.assigned
              ? `${current.effectivePermissions.length} effective permissions`
              : 'No access'}
          </p>
        </div>
        {isUnassigned ? <Badge variant="outline">No access</Badge> : null}
      </div>

      {isUnassigned ? (
        <div className="bg-muted/30 space-y-3 rounded-md p-3">
          <FormRow htmlFor={`${current.appId}-assign-role`} label="Assign role">
            <Select
              value={roleId || undefined}
              onValueChange={(value) => setRoleId(value ?? '')}
              disabled={readOnly || roleSaving}
            >
              <SelectTrigger
                id={`${current.appId}-assign-role`}
                aria-label={`${current.appName} role`}
                className="w-full sm:w-56"
              >
                <SelectValue placeholder="Choose a role">
                  {selectedRole?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {current.roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>
          {readOnly ? null : (
            <Button
              type="button"
              variant="info"
              size="sm"
              disabled={!roleId || roleSaving || !onRoleChange}
              onClick={() => void changeRole(roleId)}
            >
              Assign
            </Button>
          )}
          {roleError ? (
            <AppError
              error={{
                code: 'app-access/role-change-failed',
                message: roleError,
              }}
              variant="banner"
            />
          ) : null}
        </div>
      ) : (
        <FormRow htmlFor={`${current.appId}-role`} label="Role">
          <Select
            value={roleId || undefined}
            onValueChange={(value) => value && void changeRole(value)}
            disabled={readOnly || roleSaving || !onRoleChange}
          >
            <SelectTrigger
              id={`${current.appId}-role`}
              aria-label={`${current.appName} role`}
              className="w-full sm:w-56"
            >
              <SelectValue placeholder="Choose a role">
                {selectedRole?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {current.roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {roleError ? (
            <AppError
              error={{
                code: 'app-access/role-change-failed',
                message: roleError,
              }}
              variant="banner"
              className="mt-2"
            />
          ) : null}
        </FormRow>
      )}

      {current.catalog.length === 0 ? null : (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Permissions</h4>
          {groupCatalog(current.catalog).map((group) => (
            <section
              key={group.key}
              aria-label={group.label}
              className="space-y-2"
            >
              <h5 className="text-muted-foreground text-xs font-medium">
                {group.label}
              </h5>
              <ul className="space-y-2">
                {group.permissions.map((permission) => {
                  const state = permissionState(current, permission)
                  const error = overrideErrors[permission.key]
                  const disabled =
                    readOnly ||
                    overrideSaving === permission.key ||
                    !onOverrideChange

                  return (
                    <li
                      key={permission.key}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <Checkbox
                        id={`${current.appId}-${permission.key}`}
                        checked={state === 'granted' || state === 'from role'}
                        disabled={disabled}
                        onCheckedChange={() => void changeOverride(permission)}
                      />
                      <Label
                        htmlFor={`${current.appId}-${permission.key}`}
                        className="mb-0 text-sm font-normal"
                      >
                        {permission.label}
                      </Label>
                      <Badge
                        variant={
                          state === 'denied' ? 'destructive' : 'secondary'
                        }
                      >
                        {state}
                      </Badge>
                      {permission.isDangerous ? (
                        <Badge variant="warning">Dangerous</Badge>
                      ) : null}
                      {error ? (
                        <AppError
                          error={{
                            code: 'app-access/override-change-failed',
                            message: error,
                          }}
                          variant="banner"
                          className="basis-full"
                        />
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Effective permissions</h4>
        <EffectivePermissionList
          permissions={current.effectivePermissions}
          catalog={current.catalog}
        />
      </div>
    </section>
  )
}

export function AppAccessPanel({
  entries,
  onRoleChange,
  onOverrideChange,
  readOnly = false,
}: Props) {
  const [localEntries, setLocalEntries] = useState(entries)

  useEffect(() => {
    setLocalEntries(entries)
  }, [entries])

  const entitledEntries = localEntries
    .filter((entry) => entry.entitled)
    .sort((left, right) => left.appName.localeCompare(right.appName))

  if (entitledEntries.length === 0)
    return (
      <Empty className="p-8">
        <EmptyHeader>
          <EmptyTitle>No entitled apps</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )

  return (
    <div className="space-y-4">
      {entitledEntries.map((entry) => (
        <AppAccessEntryPanel
          key={entry.appId}
          entry={entry}
          onRoleChange={onRoleChange}
          onOverrideChange={onOverrideChange}
          readOnly={readOnly}
        />
      ))}
    </div>
  )
}
