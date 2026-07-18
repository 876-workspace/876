'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { AdminApp, AdminFeature } from '@876/admin'
import { Button, buttonVariants } from '@876/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@876/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { Label } from '@876/ui/label'
import { Switch } from '@876/ui/switch'
import { Textarea } from '@876/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@876/ui/alert-dialog'

import { client } from '@/lib/client'
import { Plus, MoreHorizontalIcon } from '@876/ui/icons'
import { toast } from 'sonner'

// ─── Edit ─────────────────────────────────────────────────────────────────────

type EditProps = {
  feature: AdminFeature
  apps: AdminApp[]
  lockApp?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function EditFeatureDialog({
  feature,
  apps,
  lockApp = false,
  open: controlledOpen,
  onOpenChange,
}: EditProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [description, setDescription] = useState(feature.description ?? '')
  const [enabled, setEnabled] = useState(feature.enabled)
  const [scope, setScope] = useState(feature.scope)
  const [defaultValue, setDefaultValue] = useState(feature.default_value)
  const [consumerDefaultEnabled, setConsumerDefaultEnabled] = useState(
    feature.consumer_default_enabled
  )
  const [appId, setAppId] = useState<string>(
    feature.app_id ?? apps[0]?.id ?? ''
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: err } = await client.features.update(feature.id, {
      description: description.trim() || null,
      enabled,
      scope,
      default_value: defaultValue,
      consumer_default_enabled: consumerDefaultEnabled,
      app_id: lockApp ? feature.app_id : appId,
    })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <DialogTrigger
          render={
            <Button variant="outline" size="sm">
              Edit
            </Button>
          }
        />
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {feature.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {!lockApp && (
            <div className="space-y-1.5">
              <Label htmlFor="edit-app">App</Label>
              <Select value={appId} onValueChange={(v) => v && setAppId(v)}>
                <SelectTrigger id="edit-app">
                  <SelectValue placeholder="Select an app" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" disabled>
                    Select an App
                  </SelectItem>
                  {apps.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-scope">Scope</Label>
            <Select value={scope} onValueChange={(v) => v && setScope(v)}>
              <SelectTrigger id="edit-scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global</SelectItem>
                <SelectItem value="consumer">Consumer</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="edit-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
            <Label htmlFor="edit-enabled">Globally enabled</Label>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="edit-default-value"
              checked={defaultValue}
              onCheckedChange={setDefaultValue}
            />
            <Label htmlFor="edit-default-value">Default value</Label>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="edit-consumer-default"
              checked={consumerDefaultEnabled}
              onCheckedChange={setConsumerDefaultEnabled}
            />
            <Label htmlFor="edit-consumer-default">Consumer default</Label>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export function DeleteFeatureButton({
  feature,
  returnHref = '/features',
  open: controlledOpen,
  onOpenChange,
}: {
  feature: AdminFeature
  returnHref?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    const { error: err } = await client.features.delete(feature.id)
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    router.push(returnHref)
    router.refresh()
  }

  return (
    <div>
      <AlertDialog open={open} onOpenChange={setOpen}>
        {controlledOpen === undefined && (
          <AlertDialogTrigger
            render={
              <Button variant="destructive" size="sm" disabled={loading}>
                {loading ? 'Deleting…' : 'Delete'}
              </Button>
            }
          />
        )}
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {feature.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the flag from PostHog and removes the
              local record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && <p className="text-destructive mt-1 text-xs">{error}</p>}
    </div>
  )
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

export function FeatureToolbar({
  feature,
  apps,
  appSlug,
  returnHref = '/features',
}: {
  feature: AdminFeature
  apps: AdminApp[]
  appSlug?: string
  returnHref?: string
}) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(feature.enabled)
  const [pending, setPending] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  async function toggleFeature() {
    const next = !enabled
    setPending(true)
    setEnabled(next)

    const { error } = await client.features.update(feature.id, {
      enabled: next,
    })
    setPending(false)
    if (error) {
      setEnabled(!next)
      toast.error(error.message)
      return
    }

    toast.success(`${feature.name} ${next ? 'enabled' : 'disabled'}.`)
    router.refresh()
  }

  const newFeatureHref = appSlug
    ? `/apps/${appSlug}/features/new?group=${feature.slug}`
    : `/features/new?group=${feature.slug}`

  return (
    <>
      <div className="flex shrink-0 items-center gap-3">
        <div className="mr-2 flex items-center gap-2">
          <Switch
            id="toolbar-toggle"
            checked={enabled}
            disabled={pending}
            onCheckedChange={toggleFeature}
            aria-label={`Toggle ${feature.name}`}
          />
          <Label htmlFor="toolbar-toggle" className="text-sm font-medium">
            Enabled
          </Label>
        </div>

        <Link
          href={newFeatureHref}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          <Plus className="size-4" strokeWidth={2.25} />
          Child feature
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger
            className={buttonVariants({ variant: 'outline', size: 'icon-sm' })}
            aria-label="More actions"
          >
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setDeleteOpen(true)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <EditFeatureDialog
        feature={feature}
        apps={apps}
        lockApp={!!appSlug}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteFeatureButton
        feature={feature}
        returnHref={returnHref}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}
