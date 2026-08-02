'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Separator } from '@876/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@876/ui/sheet'
import { Switch } from '@876/ui/switch'
import { Trash } from '@876/ui/icons'
import { toast } from 'sonner'

import { client } from '@/lib/client'
import {
  PrincipalSearch,
  type Principal,
} from '@/features/access/components/principal-search'

/** An override forces a flag on or off for one principal. */
export type OverrideRow = Principal & { enabled: boolean }

export type FlagTarget = {
  id: string
  slug: string
  name: string
  /** The global kill switch. False here means nothing else can turn it on. */
  enabled: boolean
  orgOverrides: OverrideRow[]
  userOverrides: OverrideRow[]
}

export function FlagTargetingSheet({
  flag,
  open,
  onOpenChange,
}: {
  flag: FlagTarget | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  if (!flag) return null

  async function setGlobal(next: boolean) {
    if (!flag) return
    setBusy(true)
    const { error } = await client.features.update(flag.id, { enabled: next })
    setBusy(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(`${flag.name} ${next ? 'enabled' : 'disabled'}.`)
    router.refresh()
  }

  async function addOverride(
    kind: 'user' | 'organization',
    principal: Principal
  ) {
    if (!flag) return
    setBusy(true)
    const { error } =
      kind === 'user'
        ? await client.features.grantUser(principal.id, {
            feature_id: flag.id,
            enabled: true,
          })
        : await client.features.grantOrg(principal.id, {
            feature_id: flag.id,
            enabled: true,
          })
    setBusy(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(`Override added for ${principal.name}.`)
    router.refresh()
  }

  async function setOverride(
    kind: 'user' | 'organization',
    principalId: string,
    enabled: boolean
  ) {
    if (!flag) return
    setBusy(true)
    const { error } =
      kind === 'user'
        ? await client.features.updateUser(principalId, flag.id, { enabled })
        : await client.features.updateOrg(principalId, flag.id, { enabled })
    setBusy(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Override updated.')
    router.refresh()
  }

  async function removeOverride(
    kind: 'user' | 'organization',
    principalId: string
  ) {
    if (!flag) return
    setBusy(true)
    const { error } =
      kind === 'user'
        ? await client.features.revokeUser(principalId, flag.id)
        : await client.features.revokeOrg(principalId, flag.id)
    setBusy(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Override removed.')
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{flag.name}</SheetTitle>
          <SheetDescription className="font-mono text-xs">
            {flag.slug}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <section className="border-876-surface-border flex items-center justify-between gap-4 rounded-md border p-3">
            <div>
              <Label htmlFor="flag-global">Enabled</Label>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Off here means off everywhere. Overrides cannot turn it back on.
              </p>
            </div>
            <Switch
              id="flag-global"
              checked={flag.enabled}
              disabled={busy}
              onCheckedChange={setGlobal}
              aria-label="Enabled"
            />
          </section>

          <Separator className="my-5" />

          <OverrideSection
            title="Organizations"
            hint="Applies to every member of the organization."
            kind="organization"
            rows={flag.orgOverrides}
            disabled={busy || !flag.enabled}
            onAdd={(principal) => addOverride('organization', principal)}
            onSet={(id, enabled) => setOverride('organization', id, enabled)}
            onRemove={(id) => removeOverride('organization', id)}
          />

          <Separator className="my-5" />

          <OverrideSection
            title="Users"
            hint="Wins over the organization override."
            kind="user"
            rows={flag.userOverrides}
            disabled={busy || !flag.enabled}
            onAdd={(principal) => addOverride('user', principal)}
            onSet={(id, enabled) => setOverride('user', id, enabled)}
            onRemove={(id) => removeOverride('user', id)}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function OverrideSection({
  title,
  hint,
  kind,
  rows,
  disabled,
  onAdd,
  onSet,
  onRemove,
}: {
  title: string
  hint: string
  kind: 'user' | 'organization'
  rows: OverrideRow[]
  disabled: boolean
  onAdd: (principal: Principal) => void
  onSet: (principalId: string, enabled: boolean) => void
  onRemove: (principalId: string) => void
}) {
  return (
    <section>
      <div className="mb-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          {title}
          {rows.length > 0 && <Badge variant="secondary">{rows.length}</Badge>}
        </h3>
        <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>
      </div>

      <PrincipalSearch
        kind={kind}
        excludeIds={rows.map((row) => row.id)}
        onSelect={onAdd}
        disabled={disabled}
      />

      {rows.length > 0 && (
        <ul className="border-876-surface-border divide-876-surface-border mt-3 divide-y rounded-md border">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-2 px-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {row.name}
                </span>
                <span className="text-muted-foreground block truncate text-xs">
                  {row.detail}
                </span>
              </span>

              <NativeSelect
                size="sm"
                value={row.enabled ? 'enabled' : 'disabled'}
                disabled={disabled}
                aria-label={`Override for ${row.name}`}
                onChange={(event) =>
                  onSet(row.id, event.target.value === 'enabled')
                }
              >
                <NativeSelectOption value="enabled">On</NativeSelectOption>
                <NativeSelectOption value="disabled">Off</NativeSelectOption>
              </NativeSelect>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={disabled}
                aria-label={`Remove override for ${row.name}`}
                onClick={() => onRemove(row.id)}
              >
                <Trash className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
