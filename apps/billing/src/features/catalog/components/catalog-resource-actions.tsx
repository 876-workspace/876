'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { cn } from '@876/core/utils'
import { buttonVariants } from '@876/ui/button'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import {
  Copy,
  Loader2Icon,
  MoreHorizontalIcon,
  Pencil,
  Trash,
} from '@876/ui/icons'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'

import { client } from '@/lib/client'

type CatalogResource =
  | 'product'
  | 'plan'
  | 'addon'
  | 'coupon'
  | 'price-list'
  | 'item'

type Props = {
  resource: CatalogResource
  resourceId: string
  resourceName: string
  isActive: boolean
  returnHref: string
  editHref?: string
  resourceCode?: string
}

export function CatalogResourceActions({
  resource,
  resourceId,
  resourceName,
  isActive,
  returnHref,
  editHref,
  resourceCode,
}: Props) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [cloneOpen, setCloneOpen] = useState(false)
  const [cloneName, setCloneName] = useState(`${resourceName} copy`)
  const [cloneCode, setCloneCode] = useState(
    resourceCode ? `${resourceCode.slice(0, 95)}-copy` : ''
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function updateStatus() {
    setError(null)
    startTransition(async () => {
      const result = await updateCatalogResource(
        resource,
        resourceId,
        !isActive
      )
      if (result.error) {
        setError(result.error.message)
        return
      }
      router.refresh()
    })
  }

  function deleteResource() {
    setError(null)
    startTransition(async () => {
      const result = await deleteCatalogResource(resource, resourceId)
      if (result.error) {
        setError(result.error.message)
        return
      }
      setDeleteOpen(false)
      router.push(returnHref)
      router.refresh()
    })
  }

  function cloneResource() {
    if (resource !== 'plan' && resource !== 'addon') return
    setError(null)
    startTransition(async () => {
      const result =
        resource === 'plan'
          ? await client.plans.clone(resourceId, {
              code: cloneCode,
              name: cloneName,
            })
          : await client.addons.clone(resourceId, {
              code: cloneCode,
              name: cloneName,
            })
      if (result.error || !result.data) {
        setError(
          result.error?.message ?? `Failed to clone ${resourceLabel(resource)}.`
        )
        return
      }
      setCloneOpen(false)
      router.push(
        `/${resource === 'plan' ? 'plans' : 'addons'}/${result.data.id}`
      )
      router.refresh()
    })
  }

  return (
    <>
      <div className="flex items-center gap-3">
        {error ? (
          <p className="text-destructive max-w-72 text-right text-xs">
            {error}
          </p>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: 'outline', size: 'icon-sm' })
            )}
            aria-label={`Actions for ${resourceName}`}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <MoreHorizontalIcon className="size-4" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            {editHref ? (
              <DropdownMenuItem render={<Link href={editHref} />}>
                <Pencil className="size-4" />
                Edit
              </DropdownMenuItem>
            ) : null}
            {(resource === 'plan' || resource === 'addon') && resourceCode ? (
              <DropdownMenuItem
                onClick={() => {
                  setError(null)
                  setCloneOpen(true)
                }}
              >
                <Copy className="size-4" />
                Clone
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={updateStatus}>
              {isActive ? 'Archive' : 'Reactivate'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                setError(null)
                setDeleteOpen(true)
              }}
            >
              <Trash className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10">
              <Trash className="text-destructive size-6" />
            </AlertDialogMedia>
            <AlertDialogTitle>
              Delete {resourceLabel(resource)}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground font-medium">
                {resourceName}
              </strong>{' '}
              can only be deleted when it has no billing or transaction history.
              Otherwise, archive it to preserve reporting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={deleteResource}
            >
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <Trash className="size-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cloneOpen} onOpenChange={setCloneOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Copy className="size-6" />
            </AlertDialogMedia>
            <AlertDialogTitle>Clone {resourceLabel(resource)}</AlertDialogTitle>
            <AlertDialogDescription>
              Configuration, prices, tiers, and plan availability are copied
              into fresh records. Provider references and transaction history
              are not copied.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="catalog-clone-name">Name</Label>
              <Input
                id="catalog-clone-name"
                value={cloneName}
                onChange={(event) => setCloneName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="catalog-clone-code">Unique code</Label>
              <Input
                id="catalog-clone-code"
                value={cloneCode}
                onChange={(event) => setCloneCode(event.target.value)}
              />
            </div>
          </div>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending || !cloneName.trim() || !cloneCode.trim()}
              onClick={cloneResource}
            >
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <Copy className="size-4" />
              )}
              Clone
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function updateCatalogResource(
  resource: CatalogResource,
  resourceId: string,
  isActive: boolean
) {
  switch (resource) {
    case 'product':
      return client.products.update(resourceId, { isActive })
    case 'plan':
      return client.plans.update(resourceId, { isActive })
    case 'addon':
      return client.addons.update(resourceId, { isActive })
    case 'coupon':
      return client.discounts.coupons.update(resourceId, { isActive })
    case 'price-list':
      return client.priceLists.update(resourceId, { isActive })
    case 'item':
      return client.items.update(resourceId, { isActive })
  }
}

function deleteCatalogResource(resource: CatalogResource, resourceId: string) {
  switch (resource) {
    case 'product':
      return client.products.delete(resourceId)
    case 'plan':
      return client.plans.delete(resourceId)
    case 'addon':
      return client.addons.delete(resourceId)
    case 'coupon':
      return client.discounts.coupons.delete(resourceId)
    case 'price-list':
      return client.priceLists.delete(resourceId)
    case 'item':
      return client.items.delete(resourceId)
  }
}

function resourceLabel(resource: CatalogResource) {
  return resource === 'price-list' ? 'price list' : resource
}
