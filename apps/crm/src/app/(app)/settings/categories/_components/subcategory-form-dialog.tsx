'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@876/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@876/ui/dialog'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'

import { client } from '@/lib/client'

export type SubcategoryDraft = {
  id?: string
  categoryId: string
  name: string
  color: string | null
  icon: string | null
}

export function SubcategoryFormDialog({
  open,
  onOpenChange,
  subcategory,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  subcategory?: SubcategoryDraft
}) {
  const router = useRouter()
  const [name, setName] = useState(subcategory?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset on open, during render rather than in an effect — see the note in
  // category-form-dialog.tsx for why an effect flashes the previous value.
  const openedFor = open ? (subcategory?.id ?? 'new') : null
  const [lastOpenedFor, setLastOpenedFor] = useState(openedFor)
  if (openedFor !== lastOpenedFor) {
    setLastOpenedFor(openedFor)
    setName(subcategory?.name ?? '')
    setError(null)
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!subcategory) return
    const normalizedName = name.trim()
    if (!normalizedName) {
      setError('Name is required.')
      return
    }

    setSaving(true)
    const result = subcategory.id
      ? await client.requestCategories.subcategories.update(
          subcategory.categoryId,
          subcategory.id,
          { name: normalizedName }
        )
      : await client.requestCategories.subcategories.create(
          subcategory.categoryId,
          {
            name: normalizedName,
            color: subcategory.color,
            icon: subcategory.icon,
          }
        )
    setSaving(false)

    if (result.error) {
      setError(result.error.message)
      return
    }

    onOpenChange(false)
    router.refresh()
    toast.success(subcategory.id ? 'Subcategory saved.' : 'Subcategory added.')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {subcategory?.id ? 'Edit subcategory' : 'Add subcategory'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5" noValidate>
          <FormRow htmlFor="subcategory-name" label="Name" required>
            <Input
              id="subcategory-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={saving}
              aria-invalid={error === 'Name is required.'}
            />
          </FormRow>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="info"
              disabled={saving || !subcategory}
            >
              {subcategory?.id ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
