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
  AlertDialogMedia,
  AlertDialogTitle,
} from '@876/ui/alert-dialog'
import { Button } from '@876/ui/button'
import { Trash } from '@876/ui/icons'

import { financeDocumentTemplates } from '@/lib/client/finance'

interface TemplateCardActionsProps {
  orgSlug: string
  templateId: string
  isDefault: boolean
  canManage: boolean
}

export function TemplateCardActions({
  orgSlug,
  templateId,
  isDefault,
  canManage,
}: TemplateCardActionsProps) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!canManage) return null

  function run(
    task: () => Promise<{ data: unknown; error: { message: string } | null }>,
    onSuccess: () => void,
    onError?: () => void
  ) {
    setError(null)
    startTransition(async () => {
      const result = await task()
      if (result.error) {
        setError(result.error.message)
        onError?.()
        return
      }
      onSuccess()
      router.refresh()
    })
  }

  return (
    <span className="flex items-center gap-3">
      {isDefault ? null : (
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() =>
            run(
              () => financeDocumentTemplates.setDefault(orgSlug, templateId),
              () => {}
            )
          }
        >
          Set as default
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={() => setDeleteOpen(true)}
      >
        Delete
      </Button>

      {error ? (
        <span role="alert" className="text-destructive text-xs">
          {error}
        </span>
      ) : null}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10">
              <Trash className="text-destructive size-6" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              The template is removed for every document type it applies to.
              Documents already issued keep their rendered output.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={() =>
                run(
                  () => financeDocumentTemplates.remove(orgSlug, templateId),
                  () => setDeleteOpen(false),
                  // The open dialog makes the card inert, which would hide a
                  // card-level notice from assistive technology.
                  () => setDeleteOpen(false)
                )
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </span>
  )
}
