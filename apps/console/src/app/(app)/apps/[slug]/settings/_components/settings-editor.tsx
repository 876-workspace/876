'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminApp, AdminAppKind, AdminAppStatus } from '@876/admin'
import type { ReactNode } from 'react'
import { Trash } from '@876/ui/icons'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@876/ui/alert-dialog'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { OrgAvatar } from '@876/ui/org-avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'

import { client } from '@/lib/client'
import { UploadDropzone } from '@/lib/uploadthing'

const APP_KINDS = ['internal', 'platform', 'product', 'external'] as const
const APP_STATUSES = ['active', 'inactive'] as const

export type OrgOption = {
  id: string
  name: string
  logo_url: string | null
}

const NO_ORG_VALUE = 'none'

/* ── Card shell: body + muted footer with a per-card Save ──────────────── */

function SettingsCard({
  title,
  children,
  footer,
}: {
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <section className="876-card overflow-hidden">
      <div className="p-5">
        <h2 className="876-section-title mb-4">{title}</h2>
        {children}
      </div>
      {footer}
    </section>
  )
}

function SaveFooter({
  dirty,
  saving,
  error,
  onSave,
}: {
  dirty: boolean
  saving: boolean
  error: string | null
  onSave: () => void
}) {
  return (
    <footer className="border-876-surface-border bg-muted/40 flex items-center justify-between gap-4 border-t px-5 py-3">
      <p className="text-destructive min-w-0 truncate text-[0.8125rem]">
        {error}
      </p>
      <Button
        variant="info"
        size="sm"
        disabled={!dirty || saving}
        onClick={onSave}
      >
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </footer>
  )
}

/* ── General ───────────────────────────────────────────────────────────── */

type GeneralDraft = {
  name: string
  app_kind: AdminAppKind
  status: AdminAppStatus
  homepage_url: string
}

function generalDraftFrom(app: AdminApp): GeneralDraft {
  return {
    name: app.name,
    app_kind: app.app_kind,
    status: app.status,
    homepage_url: app.homepage_url ?? '',
  }
}

export function GeneralSection({ app }: { app: AdminApp }) {
  const router = useRouter()
  const [baseline, setBaseline] = useState(() => generalDraftFrom(app))
  const [draft, setDraft] = useState(baseline)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = (Object.keys(baseline) as (keyof GeneralDraft)[]).some(
    (key) => baseline[key] !== draft[key]
  )

  function set<K extends keyof GeneralDraft>(key: K, value: GeneralDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function save() {
    if (!draft.name.trim()) {
      setError('Name is required.')
      return
    }

    setSaving(true)
    setError(null)
    const { error: updateError } = await client.apps.update(app.id, {
      name: draft.name.trim(),
      app_kind: draft.app_kind,
      status: draft.status,
      homepage_url: draft.homepage_url.trim() || null,
    })
    setSaving(false)
    if (updateError) {
      setError(updateError.message)
      return
    }

    setBaseline(draft)
    router.refresh()
  }

  return (
    <SettingsCard
      title="General"
      footer={
        <SaveFooter
          dirty={dirty}
          saving={saving}
          error={error}
          onSave={() => void save()}
        />
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="app-name">Name</Label>
          <Input
            id="app-name"
            value={draft.name}
            onChange={(event) => set('name', event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="app-homepage">Homepage URL</Label>
          <Input
            id="app-homepage"
            type="url"
            value={draft.homepage_url}
            onChange={(event) => set('homepage_url', event.target.value)}
            placeholder="https://example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="app-kind">Kind</Label>
          <NativeSelect
            id="app-kind"
            value={draft.app_kind}
            onChange={(event) =>
              set('app_kind', event.target.value as AdminAppKind)
            }
            className="w-full capitalize"
          >
            {APP_KINDS.map((kind) => (
              <NativeSelectOption
                key={kind}
                value={kind}
                className="capitalize"
              >
                {kind}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <Label htmlFor="app-status">Status</Label>
          <NativeSelect
            id="app-status"
            value={draft.status}
            onChange={(event) =>
              set('status', event.target.value as AdminAppStatus)
            }
            className="w-full capitalize"
          >
            {APP_STATUSES.map((status) => (
              <NativeSelectOption
                key={status}
                value={status}
                className="capitalize"
              >
                {status}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>
    </SettingsCard>
  )
}

/* ── Ownership ─────────────────────────────────────────────────────────── */

export function OwnershipSection({
  app,
  orgs,
}: {
  app: AdminApp
  orgs: OrgOption[]
}) {
  const router = useRouter()
  const [baseline, setBaseline] = useState(app.organization_id ?? '')
  const [selected, setSelected] = useState(baseline)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = selected !== baseline

  async function save() {
    setSaving(true)
    setError(null)
    const { error: updateError } = await client.apps.update(app.id, {
      organization_id: selected || null,
    })
    setSaving(false)
    if (updateError) {
      setError(updateError.message)
      return
    }

    setBaseline(selected)
    router.refresh()
  }

  return (
    <SettingsCard
      title="Ownership"
      footer={
        <SaveFooter
          dirty={dirty}
          saving={saving}
          error={error}
          onSave={() => void save()}
        />
      }
    >
      <div className="max-w-md space-y-2">
        <Label htmlFor="app-organization">Organization</Label>
        <Select
          value={selected || NO_ORG_VALUE}
          onValueChange={(value) =>
            setSelected(!value || value === NO_ORG_VALUE ? '' : value)
          }
        >
          <SelectTrigger id="app-organization" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_ORG_VALUE}>
              <span className="text-muted-foreground">No organization</span>
            </SelectItem>
            {orgs.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                <span className="flex min-w-0 items-center gap-2">
                  <OrgAvatar
                    name={org.name}
                    src={org.logo_url}
                    size="sm"
                    className="size-4 shrink-0 rounded-[5px] text-[0.5rem]"
                  />
                  <span className="truncate">{org.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </SettingsCard>
  )
}

/* ── App icon (saves immediately) ──────────────────────────────────────── */

export function IconSection({ app }: { app: AdminApp }) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function updateLogo(logoUrl: string | null) {
    setUpdating(true)
    setError(null)
    const { error: updateError } = await client.apps.update(app.id, {
      logo_url: logoUrl,
    })
    setUpdating(false)
    if (updateError) {
      setError(updateError.message)
      return
    }

    router.refresh()
  }

  return (
    <SettingsCard title="App icon">
      {app.logo_url ? (
        <div className="flex items-center gap-5">
          <OrgAvatar
            name={app.name}
            src={app.logo_url}
            size="lg"
            className="size-16 rounded-lg"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={updating}
            onClick={() => void updateLogo(null)}
          >
            {updating ? 'Removing...' : 'Remove'}
          </Button>
        </div>
      ) : (
        <UploadDropzone
          endpoint="appIcon"
          onClientUploadComplete={(files) => {
            const url = files[0]?.serverData?.url
            if (url) void updateLogo(url)
          }}
          onUploadError={(uploadError) => setError(uploadError.message)}
        />
      )}
      {error && (
        <p className="text-destructive mt-2 text-[0.8125rem]">{error}</p>
      )}
    </SettingsCard>
  )
}

/* ── Danger zone ───────────────────────────────────────────────────────── */

export function DangerSection({ app }: { app: AdminApp }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirmed = confirmation === app.name

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    const { error: deleteError } = await client.apps.remove(app.id)
    if (deleteError) {
      setError(deleteError.message)
      setDeleting(false)
      return
    }

    router.push('/apps')
    router.refresh()
  }

  return (
    <section className="876-card border-destructive/40 overflow-hidden">
      <div className="p-5">
        <h2 className="876-section-title text-destructive mb-4">Danger zone</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium">Delete this app</p>
            <p className="text-muted-foreground text-[0.8125rem]">
              Permanently removes the app, its API keys, and configuration.
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            className="shrink-0 sm:self-center"
            onClick={() => {
              setConfirmation('')
              setError(null)
              setOpen(true)
            }}
          >
            Delete
          </Button>
        </div>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10">
              <Trash className="text-destructive size-6" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete app?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground font-medium">
                {app.name}
              </strong>{' '}
              and its API keys will be permanently removed. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="delete-confirmation">
              Type{' '}
              <span className="text-foreground font-mono font-medium">
                {app.name}
              </span>{' '}
              to confirm
            </Label>
            <Input
              id="delete-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={app.name}
              disabled={deleting}
              autoComplete="off"
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!confirmed || deleting}
              onClick={(event) => {
                // Keep the dialog open so errors / pending state can surface.
                event.preventDefault()
                void handleDelete()
              }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
