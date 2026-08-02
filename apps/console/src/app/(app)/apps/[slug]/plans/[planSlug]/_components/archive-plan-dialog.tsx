'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@876/ui/dialog'
import { Button } from '@876/ui/button'

import { client } from '@/lib/client'

type Props = {
  productId: string
  productName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ArchivePlanDialog({
  productId,
  productName,
  open,
  onOpenChange,
}: Props) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleArchive() {
    setError(null)
    startTransition(async () => {
      const { error } = await client.products.archive(productId)
      if (error) {
        setError(error.message)
        return
      }
      toast.success(`"${productName}" archived.`)
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive &quot;{productName}&quot;</DialogTitle>
          <DialogDescription>
            Are you sure? Existing subscribers will keep their current plan, but
            no new subscriptions can be created.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleArchive}
            disabled={isPending}
          >
            {isPending ? 'Archiving…' : 'Archive'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
