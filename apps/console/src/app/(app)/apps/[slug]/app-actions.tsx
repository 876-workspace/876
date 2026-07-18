'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDownFromLine,
  MoreHorizontalIcon,
  Pencil,
  Trash,
} from '@876/ui/icons'
import { cn } from '@876/core/utils'
import { Button, buttonVariants } from '@876/ui/button'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@876/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'

import type { AdminApp } from '@876/admin'
import { client } from '@/lib/client'
import { APP_STATUSES, isAppStatus } from '@/lib/app-status'

type Props = { app: AdminApp }

export function AppActions({ app }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState(app.status)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const { error } = await client.apps.update(app.id, { status })
      if (error) {
        setError(error.message)
        return
      }

      setOpen(false)
      router.refresh()
    })
  }

  function handleStatusChange(value: string) {
    if (isAppStatus(value)) setStatus(value)
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Pencil className="size-3.5" />
        Edit status
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b px-6 py-6">
            <SheetTitle>Edit app status</SheetTitle>
          </SheetHeader>

          <div className="flex-1 space-y-4 p-6">
            <div className="space-y-2">
              <Label htmlFor="app-status">Status</Label>
              <NativeSelect
                id="app-status"
                value={status}
                onChange={(event) => handleStatusChange(event.target.value)}
                className="w-full capitalize"
              >
                {APP_STATUSES.map((value) => (
                  <NativeSelectOption
                    key={value}
                    value={value}
                    className="capitalize"
                  >
                    {value}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>

          <SheetFooter className="border-t px-6 py-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: 'outline', size: 'icon-sm' })
          )}
          aria-label="More actions"
        >
          <MoreHorizontalIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-44">
          <DropdownMenuItem disabled>
            <ArrowDownFromLine className="size-4" />
            Export app
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" disabled>
            <Trash className="size-4" />
            Delete app
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
