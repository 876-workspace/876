'use client'

import { useState } from 'react'
import { Copy, Trash, MoreHorizontalIcon } from '@876/ui/icons'
import { cn } from '@876/core/utils'
import { buttonVariants } from '@876/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { ArchivePlanDialog } from './archive-plan-dialog'

type Props = {
  productId: string
  productName: string
  productStatus: string
}

export function PlanActions({ productId, productName, productStatus }: Props) {
  const [archiveOpen, setArchiveOpen] = useState(false)

  return (
    <>
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
            <Copy className="size-4" />
            Duplicate plan
          </DropdownMenuItem>
          {productStatus === 'active' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-500 focus:text-red-500"
                onSelect={(event) => {
                  event.preventDefault()
                  setArchiveOpen(true)
                }}
              >
                <Trash className="size-4" />
                Archive plan
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ArchivePlanDialog
        productId={productId}
        productName={productName}
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
      />
    </>
  )
}
