'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { CustomerContact } from '@876/billing'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Badge } from '@876/ui/badge'
import { buttonVariants, Button } from '@876/ui/button'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { MoreHorizontalIcon } from '@876/ui/icons'

import { PanelError, PanelFrame, PanelRowsSkeleton } from './panel-frame'
import type { PanelProps, PanelState } from './panel'

export interface CustomerContactsPanelProps extends PanelProps {
  state: PanelState<CustomerContact[]>
  addHref: string
  editHref: (contactId: string) => string
  onDelete?: (contactId: string) => void | Promise<void>
  canManage: boolean
  deletingContactId?: string | null
}

export function CustomerContactsPanel({
  state,
  addHref,
  editHref,
  onDelete,
  canManage,
  deletingContactId,
  ...props
}: CustomerContactsPanelProps) {
  return (
    <PanelFrame
      title="Contacts"
      action={
        canManage ? (
          <Link
            href={addHref}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            + Add
          </Link>
        ) : null
      }
      {...props}
    >
      {state.status === 'ready' ? (
        <div className="divide-y">
          {state.data.map((contact) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              editHref={editHref(contact.id)}
              canManage={canManage}
              deleting={deletingContactId === contact.id}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : state.status === 'empty' ? (
        <p className="text-muted-foreground py-2 text-sm">No contacts yet.</p>
      ) : (
        <PanelError error={state} />
      )}
    </PanelFrame>
  )
}

export function CustomerContactsPanelSkeleton() {
  return (
    <PanelFrame title="Contacts">
      <PanelRowsSkeleton rows={3} />
    </PanelFrame>
  )
}

function ContactRow({
  contact,
  editHref,
  canManage,
  deleting,
  onDelete,
}: {
  contact: CustomerContact
  editHref: string
  canManage: boolean
  deleting: boolean
  onDelete?: (contactId: string) => void | Promise<void>
}) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const name = contactName(contact)
  const details = [
    contact.email,
    contact.workPhone,
    contact.mobilePhone,
  ].filter(Boolean)

  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <Avatar className="size-9 text-xs">
        {contact.avatar ? <AvatarImage src={contact.avatar} alt="" /> : null}
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{name}</p>
          {contact.isPrimary ? (
            <Badge variant="secondary">Primary</Badge>
          ) : null}
        </div>
        {details.length ? (
          <p className="text-muted-foreground truncate text-xs">
            {details.join(' · ')}
          </p>
        ) : null}
      </div>
      {canManage ? (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Actions for ${name}`}
                />
              }
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link href={editHref} />}>
                Edit
              </DropdownMenuItem>
              {onDelete ? (
                <DropdownMenuItem
                  variant="destructive"
                  disabled={deleting}
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
          {onDelete ? (
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this contact?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={deleting}
                    onClick={() => onDelete(contact.id)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function contactName(contact: CustomerContact) {
  return (
    [contact.salutation, contact.firstName, contact.lastName]
      .filter(Boolean)
      .join(' ') ||
    contact.email ||
    'Unnamed contact'
  )
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  )
}
