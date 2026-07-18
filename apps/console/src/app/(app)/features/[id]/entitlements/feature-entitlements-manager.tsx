'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type {
  AdminApp,
  AdminFeature,
  AdminOrgFeature,
  AdminOrganization,
  AdminUser,
  AdminUserFeature,
} from '@876/admin'
import { Button } from '@876/ui/button'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Switch } from '@876/ui/switch'
import { toast } from 'sonner'

import { client } from '@/lib/client'

type OverrideStatus = 'inherited' | 'enabled' | 'disabled'

type OrgRow = {
  organization: AdminOrganization
  grant: AdminOrgFeature | null
}

type UserRow = {
  user: AdminUser
  grant: AdminUserFeature | null
}

type Props = {
  feature: AdminFeature
  apps: AdminApp[]
  orgRows: OrgRow[]
  userRows: UserRow[]
}

function statusFromGrant(
  grant: AdminOrgFeature | AdminUserFeature | null
): OverrideStatus {
  if (!grant) return 'inherited'
  return grant.status === 'enabled' ? 'enabled' : 'disabled'
}

function userLabel(user: AdminUser): string {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ')
  return name || user.username || user.email
}

export function FeatureEntitlementsManager({
  feature,
  apps,
  orgRows,
  userRows,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [appId, setAppId] = useState(feature.app_id ?? '')
  const [enabled, setEnabled] = useState(feature.enabled)
  const [defaultValue, setDefaultValue] = useState(feature.default_value)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [orgGrants, setOrgGrants] = useState<
    Record<string, AdminOrgFeature | null>
  >(() =>
    Object.fromEntries(orgRows.map((row) => [row.organization.id, row.grant]))
  )
  const [userGrants, setUserGrants] = useState<
    Record<string, AdminUserFeature | null>
  >(() => Object.fromEntries(userRows.map((row) => [row.user.id, row.grant])))
  const isWidgetFeature = feature.tags.includes('widget')

  function saveAppEntitlement() {
    startTransition(async () => {
      const { error } = await client.features.update(feature.id, {
        ...(feature.app_id ? { app_id: appId } : {}),
        enabled,
        ...(isWidgetFeature ? { default_value: defaultValue } : {}),
      })
      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('App entitlement updated.')
      router.refresh()
    })
  }

  async function setOrgStatus(organizationId: string, status: OverrideStatus) {
    const key = `org:${organizationId}`
    const previous = orgGrants[organizationId] ?? null
    setPendingKey(key)

    const result =
      status === 'inherited'
        ? previous
          ? await client.features.revokeOrg(organizationId, feature.id)
          : { data: null, error: null }
        : previous
          ? await client.features.updateOrg(organizationId, feature.id, {
              enabled: status === 'enabled',
            })
          : await client.features.grantOrg(organizationId, {
              feature_id: feature.id,
              enabled: status === 'enabled',
            })

    setPendingKey(null)
    if (result.error) {
      toast.error(result.error.message)
      return
    }

    setOrgGrants((current) => ({
      ...current,
      [organizationId]:
        status === 'inherited' ? null : (result.data as AdminOrgFeature),
    }))
    toast.success('Organization override updated.')
    router.refresh()
  }

  async function setUserStatus(userId: string, status: OverrideStatus) {
    const key = `user:${userId}`
    const previous = userGrants[userId] ?? null
    setPendingKey(key)

    const result =
      status === 'inherited'
        ? previous
          ? await client.features.revokeUser(userId, feature.id)
          : { data: null, error: null }
        : previous
          ? await client.features.updateUser(userId, feature.id, {
              enabled: status === 'enabled',
            })
          : await client.features.grantUser(userId, {
              feature_id: feature.id,
              enabled: status === 'enabled',
            })

    setPendingKey(null)
    if (result.error) {
      toast.error(result.error.message)
      return
    }

    setUserGrants((current) => ({
      ...current,
      [userId]:
        status === 'inherited' ? null : (result.data as AdminUserFeature),
    }))
    toast.success('User override updated.')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Feature access</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {isWidgetFeature
            ? 'Set the rollout baseline, then override access for individual organizations or users. A user override wins over the organization and default settings; the global enabled switch is always the final kill switch.'
            : 'Set the application state, then override access for individual organizations or users. A user override wins over the organization setting.'}
        </p>
      </div>

      <section className="876-card overflow-hidden">
        <div className="border-876-surface-border flex flex-col gap-4 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold">
              {feature.app_id ? 'App default' : 'Platform default'}
            </h3>
            <p className="text-muted-foreground text-sm">{feature.slug}</p>
          </div>
          <Button onClick={saveAppEntitlement} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-[1fr_auto_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="feature-app-scope">App</Label>
            {feature.app_id ? (
              <NativeSelect
                id="feature-app-scope"
                value={appId}
                onChange={(event) => setAppId(event.target.value)}
                className="w-full"
              >
                {apps.map((app) => (
                  <NativeSelectOption key={app.id} value={app.id}>
                    {app.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            ) : (
              <div className="border-input bg-muted/40 rounded-md border px-3 py-2 text-sm">
                All 876 apps
              </div>
            )}
          </div>

          {isWidgetFeature && (
            <div className="border-876-surface-border flex h-9 items-center gap-3 rounded-md border px-3">
              <Switch
                id="feature-default-access"
                checked={defaultValue}
                onCheckedChange={setDefaultValue}
              />
              <Label htmlFor="feature-default-access">Default access</Label>
            </div>
          )}

          <div className="border-876-surface-border flex h-9 items-center gap-3 rounded-md border px-3">
            <Switch
              id="feature-app-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
            <Label htmlFor="feature-app-enabled">Global kill switch</Label>
          </div>
        </div>
      </section>

      <EntitlementTable
        title="Organization overrides"
        description="Force this feature on or off for a whole organization."
        emptyLabel="No organizations found."
        rows={orgRows.map((row) => ({
          id: row.organization.id,
          href: `/orgs/${row.organization.slug}`,
          primary: row.organization.name ?? row.organization.slug,
          secondary: row.organization.slug,
          status: statusFromGrant(orgGrants[row.organization.id] ?? null),
          pending: pendingKey === `org:${row.organization.id}`,
          onChange: (status) => setOrgStatus(row.organization.id, status),
        }))}
      />

      <EntitlementTable
        title="User overrides"
        description="Force this feature on or off for one user. This wins over app and organization settings."
        emptyLabel="No users found."
        rows={userRows.map((row) => ({
          id: row.user.id,
          href: `/users/${row.user.username ?? row.user.id}`,
          primary: userLabel(row.user),
          secondary: row.user.email,
          status: statusFromGrant(userGrants[row.user.id] ?? null),
          pending: pendingKey === `user:${row.user.id}`,
          onChange: (status) => setUserStatus(row.user.id, status),
        }))}
      />
    </div>
  )
}

function EntitlementTable({
  title,
  description,
  emptyLabel,
  rows,
}: {
  title: string
  description: string
  emptyLabel: string
  rows: {
    id: string
    href: string
    primary: string
    secondary: string
    status: OverrideStatus
    pending: boolean
    onChange: (status: OverrideStatus) => void
  }[]
}) {
  return (
    <section className="876-card overflow-hidden">
      <div className="border-876-surface-border border-b px-5 py-4">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground px-5 py-4 text-sm">{emptyLabel}</p>
      ) : (
        <div className="divide-876-surface-border divide-y">
          {rows.map((row) => (
            <div
              key={row.id}
              className="grid gap-3 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-center"
            >
              <div className="min-w-0">
                <Link
                  href={row.href}
                  className="hover:text-primary block truncate text-sm font-medium"
                >
                  {row.primary}
                </Link>
                <p className="text-muted-foreground truncate text-xs">
                  {row.secondary}
                </p>
              </div>

              <NativeSelect
                value={row.status}
                onChange={(event) =>
                  row.onChange(event.target.value as OverrideStatus)
                }
                disabled={row.pending}
                size="sm"
                className="w-full"
              >
                <NativeSelectOption value="inherited">
                  Inherit default
                </NativeSelectOption>
                <NativeSelectOption value="enabled">
                  Force enabled
                </NativeSelectOption>
                <NativeSelectOption value="disabled">
                  Force disabled
                </NativeSelectOption>
              </NativeSelect>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
