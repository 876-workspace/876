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
import type { RequestPriority } from '@/types/crm'

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
  defaultPriorityId: string | null
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  priorities,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: CategoryDraft
  priorities: RequestPriority[]
}) {
  const router = useRouter()
  const [name, setName] = useState(category?.name ?? '')
  const [color, setColor] = useState(category?.color ?? 'blue')
  const [icon, setIcon] = useState<CategoryIconKey>(category?.icon ?? 'tag')
  const [defaultPriorityId, setDefaultPriorityId] = useState(
    category?.defaultPriorityId ?? ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openedFor = open ? (category?.id ?? 'new') : null
  const [lastOpenedFor, setLastOpenedFor] = useState(openedFor)
  if (openedFor !== lastOpenedFor) {
    setLastOpenedFor(openedFor)
    setName(category?.name ?? '')
    setColor(category?.color ?? 'blue')
    setIcon(category?.icon ?? 'tag')
    setDefaultPriorityId(category?.defaultPriorityId ?? '')
    setError(null)
  }

  const availablePriorities = priorities.filter(
    (priority) => priority.isActive || priority.id === defaultPriorityId
  )

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedName = name.trim()
    if (!normalizedName) {
      setError('Name is required.')
      return
    }

    setSaving(true)
    setError(null)
    const payload = {
      name: normalizedName,
      color,
      icon,
      defaultPriorityId: defaultPriorityId || null,
    }
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
          <FormRow label="Default priority">
            <Select
              value={defaultPriorityId || 'none'}
              onValueChange={(value) =>
                setDefaultPriorityId(value === 'none' ? '' : (value ?? ''))
              }
              disabled={saving}
            >
              <SelectTrigger aria-label="Default priority">
                <SelectValue placeholder="No category default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No category default</SelectItem>
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
            <Button type="submit" variant="info" disabled={saving}>
              {category?.id ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
