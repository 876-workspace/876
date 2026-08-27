'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@876/ui/button'
import type { CategoryIconKey } from '@876/ui/category-icons'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@876/ui/dialog'
import { FormRow, FormRowGroup } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'

import { client } from '@/lib/client'

import { CategoryIconPicker } from './category-icon-picker'

const CATEGORY_COLORS = [
  'blue',
  'violet',
  'amber',
  'rose',
  'cyan',
  'slate',
] as const

export type CategoryDraft = {
  id?: string
  name: string
  color: string
  icon: CategoryIconKey
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: CategoryDraft
}) {
  const router = useRouter()
  const [name, setName] = useState(category?.name ?? '')
  const [color, setColor] = useState(category?.color ?? 'blue')
  const [icon, setIcon] = useState<CategoryIconKey>(category?.icon ?? 'tag')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset the fields when the dialog opens on a different record.
  //
  // Adjusting state **during render** rather than in an effect: React re-runs
  // this component immediately without committing the discarded pass, so there
  // is no second paint and no cascading render. An effect would commit the
  // stale values first, flashing the previous category's name into the inputs.
  // https://react.dev/learn/you-might-not-need-an-effect
  const openedFor = open ? (category?.id ?? 'new') : null
  const [lastOpenedFor, setLastOpenedFor] = useState(openedFor)
  if (openedFor !== lastOpenedFor) {
    setLastOpenedFor(openedFor)
    setName(category?.name ?? '')
    setColor(category?.color ?? 'blue')
    setIcon(category?.icon ?? 'tag')
    setError(null)
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedName = name.trim()
    if (!normalizedName) {
      setError('Name is required.')
      return
    }

    setSaving(true)
    setError(null)
    const payload = { name: normalizedName, color, icon }
    const result = category?.id
      ? await client.requestCategories.update(category.id, payload)
      : await client.requestCategories.create(payload)
    setSaving(false)

    if (result.error) {
      setError(result.error.message)
      return
    }

    onOpenChange(false)
    router.replace('/settings/categories')
    router.refresh()
    toast.success(category?.id ? 'Category saved.' : 'Category added.')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Categories are intentionally managed in dialogs: this is the sanctioned low-stakes, three-field exception. */}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {category?.id ? 'Edit category' : 'Add category'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5" noValidate>
          <FormRow htmlFor="category-name" label="Name" required>
            <Input
              id="category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={saving}
              aria-invalid={error === 'Name is required.'}
            />
          </FormRow>
          <FormRow label="Colour">
            <FormRowGroup>
              <Select
                value={color}
                onValueChange={(value) => value && setColor(value)}
                disabled={saving}
              >
                <SelectTrigger aria-label="Colour" className="min-w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_COLORS.map((option) => (
                    <SelectItem key={option} value={option}>
                      <span className="capitalize">{option}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <CategoryIconPicker
                value={icon}
                onChange={setIcon}
                disabled={saving}
              />
            </FormRowGroup>
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
            <Button type="submit" variant="info" disabled={saving}>
              {category?.id ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
