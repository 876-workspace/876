'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { Switch } from '@876/ui/switch'
import type { PackageCategory } from '@876/couriers/admin'

import { packageCategories } from '@/lib/client/package-categories'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_DESCRIPTION_LENGTH = 500

type Props = {
  orgSlug: string
  category?: PackageCategory
}

export function PackageCategoryForm({ orgSlug, category }: Props) {
  const router = useRouter()
  const [name, setName] = useState(category?.name ?? '')
  const [slug, setSlug] = useState(category?.slug ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [sortOrder, setSortOrder] = useState(
    category ? String(category.sort_order) : ''
  )
  const [isActive, setIsActive] = useState(category?.is_active ?? true)
  const [error, setError] = useState<string | null>(null)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const listHref = `/${orgSlug}/settings/customization/package-categories`

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    if (trimmedName === '') {
      setError('Enter a category name.')
      return
    }

    const trimmedSlug = slug.trim()
    if (
      trimmedSlug === '' ||
      trimmedSlug.length > 80 ||
      !SLUG_PATTERN.test(trimmedSlug)
    ) {
      setError('Slug must use lowercase letters, numbers, and hyphens.')
      return
    }

    const trimmedDescription = description.trim()
    if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      setError('Description must be 500 characters or fewer.')
      return
    }

    const trimmedOrder = sortOrder.trim()
    if (trimmedOrder !== '' && !/^\d+$/.test(trimmedOrder)) {
      setError('Sort order must be a whole number of 0 or more.')
      return
    }

    startTransition(async () => {
      const result = category
        ? await packageCategories.update(orgSlug, category.id, {
            name: trimmedName,
            slug: trimmedSlug,
            description: trimmedDescription === '' ? null : trimmedDescription,
            ...(trimmedOrder === ''
              ? {}
              : { sort_order: Number.parseInt(trimmedOrder, 10) }),
            is_active: isActive,
          })
        : await packageCategories.create(orgSlug, {
            name: trimmedName,
            slug: trimmedSlug,
            ...(trimmedDescription === ''
              ? {}
              : { description: trimmedDescription }),
            ...(trimmedOrder === ''
              ? {}
              : { sort_order: Number.parseInt(trimmedOrder, 10) }),
            is_active: isActive,
          })

      if (result.error) {
        setError(result.error.message)
        return
      }

      router.push(listHref)
      router.refresh()
    })
  }

  function archive() {
    if (!category) return

    setError(null)
    startTransition(async () => {
      const result = await packageCategories.archive(orgSlug, category.id)
      if (result.error) {
        setError(result.error.message)
        setArchiveOpen(false)
        return
      }

      setArchiveOpen(false)
      router.push(listHref)
      router.refresh()
    })
  }

  return (
    <>
      <form className="max-w-3xl space-y-6" onSubmit={save}>
        <div className="876-card space-y-5 p-5">
          <FormRow htmlFor="category-name" label="Name" required>
            <Input
              id="category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isPending}
              maxLength={120}
            />
          </FormRow>
          <FormRow
            htmlFor="category-slug"
            label="Slug"
            required
            hint="Lowercase letters, numbers, and hyphens only."
          >
            <Input
              id="category-slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              disabled={isPending}
              maxLength={80}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </FormRow>
          <FormRow htmlFor="category-description" label="Description">
            <Input
              id="category-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isPending}
              maxLength={500}
            />
          </FormRow>
          <FormRow htmlFor="category-sort-order" label="Sort order">
            <Input
              id="category-sort-order"
              type="text"
              inputMode="numeric"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              disabled={isPending}
            />
          </FormRow>
          <FormRow label="Active">
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={isPending}
              aria-label="Active"
            />
          </FormRow>
          {category?.provisioning_key ? (
            <FormRow
              htmlFor="category-provisioning-key"
              label="Provisioning key"
            >
              <Input
                id="category-provisioning-key"
                value={category.provisioning_key}
                readOnly
                className="font-mono"
              />
            </FormRow>
          ) : null}
        </div>

        {error ? (
          <p className="text-destructive text-[0.8125rem]">{error}</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {category ? (
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={() => setArchiveOpen(true)}
              >
                Archive
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(listHref)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="info" disabled={isPending}>
              {category ? 'Save' : 'Add'}
            </Button>
          </div>
        </div>
      </form>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive package category?</AlertDialogTitle>
            <AlertDialogDescription>
              This category will be archived and hidden from new packages.
              Existing packages keep their category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={archive}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
