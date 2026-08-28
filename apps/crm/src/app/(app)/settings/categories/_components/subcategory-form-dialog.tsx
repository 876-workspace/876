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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'

import { client } from '@/lib/client'
import type { RequestPriority } from '@/types/crm'

export type SubcategoryDraft = {
  id?: string
  categoryId: string
  name: string
  color: string | null
  icon: string | null
  defaultPriorityId: string | null
}

export function SubcategoryFormDialog({
  open,
  onOpenChange,
  subcategory,
  priorities,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  subcategory?: SubcategoryDraft
  priorities: RequestPriority[]
}) {
  const router = useRouter()
  const [name, setName] = useState(subcategory?.name ?? '')
  const [defaultPriorityId, setDefaultPriorityId] = useState(
    subcategory?.defaultPriorityId ?? ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openedFor = open ? (subcategory?.id ?? 'new') : null
  const [lastOpenedFor, setLastOpenedFor] = useState(openedFor)
  if (openedFor !== lastOpenedFor) {
    setLastOpenedFor(openedFor)
    setName(subcategory?.name ?? '')
    setDefaultPriorityId(subcategory?.defaultPriorityId ?? '')
    setError(null)
  }

  const availablePriorities = priorities.filter(
    (priority) => priority.isActive || priority.id === defaultPriorityId
  )

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!subcategory) return
    const normalizedName = name.trim()
    if (!normalizedName) {
      setError('Name is required.')
      return
    }

    setSaving(true)
    const priority = defaultPriorityId || null
    const result = subcategory.id
      ? await client.requestCategories.subcategories.update(
          subcategory.categoryId,
          subcategory.id,
          { name: normalizedName, defaultPriorityId: priority }
        )
      : await client.requestCategories.subcategories.create(
          subcategory.categoryId,
          {
            name: normalizedName,
            color: subcategory.color,
            icon: subcategory.icon,
            defaultPriorityId: priority,
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
          <FormRow label="Default priority">
            <Select
              value={defaultPriorityId || 'none'}
              onValueChange={(value) =>
                setDefaultPriorityId(value === 'none' ? '' : (value ?? ''))
              }
              disabled={saving}
            >
              <SelectTrigger aria-label="Default priority">
                <SelectValue placeholder="Inherit category default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Inherit category default</SelectItem>
                {availablePriorities.map((priority) => (
                  <SelectItem key={priority.id} value={priority.id}>
                    {priority.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
