'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import type { AdminOrgLocation, AdminOrgLocationCreateParams } from '@876/admin'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@876/ui/alert-dialog'
import { Button } from '@876/ui/button'
import { Checkbox } from '@876/ui/checkbox'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import { client } from '@/lib/client'

export function LocationForm({
  slug,
  location,
}: {
  slug: string
  location?: AdminOrgLocation
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [name, setName] = useState(location?.name ?? '')
  const [code, setCode] = useState(location?.code ?? '')
  const [type, setType] = useState(location?.type ?? 'office')
  const [status, setStatus] = useState(location?.status ?? 'active')
  const [isPrimary, setIsPrimary] = useState(location?.is_primary ?? false)
  const [line1, setLine1] = useState(location?.line1 ?? '')
  const [line2, setLine2] = useState(location?.line2 ?? '')
  const [city, setCity] = useState(location?.city ?? '')
  const [postalCode, setPostalCode] = useState(location?.postal_code ?? '')
  const [countryCode, setCountryCode] = useState(location?.country_code ?? '')
  const [phone, setPhone] = useState(location?.phone ?? '')
  const [email, setEmail] = useState(location?.email ?? '')
  const [timezone, setTimezone] = useState(location?.timezone ?? '')

  const isEdit = !!location

  function opt(val: string): string | null {
    const trimmed = val.trim()
    return trimmed === '' ? null : trimmed
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (isPending) return

    const params: AdminOrgLocationCreateParams = {
      name: name.trim(),
      code: opt(code),
      type,
      is_primary: isPrimary,
      line1: opt(line1),
      line2: opt(line2),
      city: opt(city),
      postal_code: opt(postalCode),
      country_code: opt(countryCode),
      phone: opt(phone),
      email: opt(email),
      timezone: opt(timezone),
      ...(isEdit ? { status } : {}),
    }

    startTransition(async () => {
      const result = isEdit
        ? await client.orgs.locations.update(slug, location.id, params)
        : await client.orgs.locations.create(slug, params)

      if (result.error) {
        toast.error(result.error.message)
        return
      }

      toast.success('Location saved.')
      router.push(`/${slug}/locations`)
      router.refresh()
    })
  }

  function handleDelete() {
    if (isPending || !isEdit) return

    startTransition(async () => {
      const { error } = await client.orgs.locations.delete(slug, location.id)
      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Location deleted.')
      router.push(`/${slug}/locations`)
      router.refresh()
    })
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
        <div className="876-card space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="loc-name">Name</Label>
            <Input
              id="loc-name"
              required
              value={name}
              disabled={isPending}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="loc-code">Code</Label>
            <Input
              id="loc-code"
              value={code}
              disabled={isPending}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="loc-type">Type</Label>
            <NativeSelect
              id="loc-type"
              className="w-full"
              value={type}
              disabled={isPending}
              onChange={(e) => setType(e.target.value)}
            >
              <NativeSelectOption value="headquarters">
                Headquarters
              </NativeSelectOption>
              <NativeSelectOption value="branch">Branch</NativeSelectOption>
              <NativeSelectOption value="office">Office</NativeSelectOption>
              <NativeSelectOption value="store">Store</NativeSelectOption>
              <NativeSelectOption value="warehouse">
                Warehouse
              </NativeSelectOption>
              <NativeSelectOption value="remote">Remote</NativeSelectOption>
              <NativeSelectOption value="other">Other</NativeSelectOption>
            </NativeSelect>
          </div>

          {isEdit && (
            <div className="space-y-2">
              <Label htmlFor="loc-status">Status</Label>
              <NativeSelect
                id="loc-status"
                className="w-full"
                value={status}
                disabled={isPending}
                onChange={(e) => setStatus(e.target.value)}
              >
                <NativeSelectOption value="active">Active</NativeSelectOption>
                <NativeSelectOption value="inactive">
                  Inactive
                </NativeSelectOption>
              </NativeSelect>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="loc-primary"
              checked={isPrimary}
              disabled={isPending}
              onCheckedChange={(checked) => setIsPrimary(!!checked)}
            />
            <Label htmlFor="loc-primary">Primary location</Label>
          </div>
        </div>

        <div className="876-card space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="loc-line1">Address line 1</Label>
            <Input
              id="loc-line1"
              value={line1}
              disabled={isPending}
              onChange={(e) => setLine1(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="loc-line2">Address line 2</Label>
            <Input
              id="loc-line2"
              value={line2}
              disabled={isPending}
              onChange={(e) => setLine2(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="loc-city">City</Label>
              <Input
                id="loc-city"
                value={city}
                disabled={isPending}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loc-postal">Postal code</Label>
              <Input
                id="loc-postal"
                value={postalCode}
                disabled={isPending}
                onChange={(e) => setPostalCode(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="loc-country">Country code</Label>
            <Input
              id="loc-country"
              maxLength={2}
              className="font-mono uppercase"
              value={countryCode}
              disabled={isPending}
              onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        <div className="876-card space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="loc-phone">Phone</Label>
            <Input
              id="loc-phone"
              type="tel"
              value={phone}
              disabled={isPending}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="loc-email">Email</Label>
            <Input
              id="loc-email"
              type="email"
              value={email}
              disabled={isPending}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="loc-tz">Timezone</Label>
            <Input
              id="loc-tz"
              placeholder="America/Jamaica"
              value={timezone}
              disabled={isPending}
              onChange={(e) => setTimezone(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          {isEdit && (
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>

      {isEdit && (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete location</AlertDialogTitle>
              <AlertDialogDescription>
                {location.name} will be permanently deleted and cannot be
                recovered.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                {isPending ? 'Deleting…' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}
