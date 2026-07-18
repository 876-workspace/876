'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import type { AdminOrgContact, AdminOrgContactCreateParams } from '@876/admin'
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
import { Checkbox } from '@876/ui/checkbox'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'

type MemberOption = { user_id: string; label: string }

export function ContactForm({
  slug,
  contact,
  members,
}: {
  slug: string
  contact?: AdminOrgContact
  members: MemberOption[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const isEdit = !!contact

  const [userId, setUserId] = useState(contact?.user_id ?? '')
  const [firstName, setFirstName] = useState(contact?.first_name ?? '')
  const [lastName, setLastName] = useState(contact?.last_name ?? '')
  const [title, setTitle] = useState(contact?.title ?? '')
  const [type, setType] = useState(contact?.type ?? 'general')
  const [email, setEmail] = useState(contact?.email ?? '')
  const [phone, setPhone] = useState(contact?.phone ?? '')
  const [mobile, setMobile] = useState(contact?.mobile ?? '')
  const [notes, setNotes] = useState(contact?.notes ?? '')
  const [isPrimary, setIsPrimary] = useState(contact?.is_primary ?? false)

  function opt(val: string): string | null {
    const trimmed = val.trim()
    return trimmed === '' ? null : trimmed
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (isPending) return

    const params: AdminOrgContactCreateParams = {
      first_name: firstName.trim(),
      user_id: userId || null,
      last_name: opt(lastName),
      title: opt(title),
      type,
      is_primary: isPrimary,
      email: opt(email),
      phone: opt(phone),
      mobile: opt(mobile),
      notes: opt(notes),
    }

    startTransition(async () => {
      const result = isEdit
        ? await client.orgs.contacts.update(slug, contact.id, params)
        : await client.orgs.contacts.create(slug, params)

      if (result.error) {
        toast.error(result.error.message)
        return
      }

      toast.success('Contact saved.')
      router.push(`/${slug}/organization/contacts`)
      router.refresh()
    })
  }

  function handleDelete() {
    if (isPending || !isEdit) return

    startTransition(async () => {
      const { error } = await client.orgs.contacts.delete(slug, contact.id)
      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Contact deleted.')
      router.push(`/${slug}/organization/contacts`)
      router.refresh()
    })
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
        <div className="876-card space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="contact-member">Link to member</Label>
            <NativeSelect
              id="contact-member"
              className="w-full"
              value={userId}
              disabled={isPending}
              onChange={(e) => setUserId(e.target.value)}
            >
              <NativeSelectOption value="">External contact</NativeSelectOption>
              {members.map((member) => (
                <NativeSelectOption key={member.user_id} value={member.user_id}>
                  {member.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-first-name">First name</Label>
            <Input
              id="contact-first-name"
              required
              value={firstName}
              disabled={isPending}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-last-name">Last name</Label>
            <Input
              id="contact-last-name"
              value={lastName}
              disabled={isPending}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-title">Title</Label>
            <Input
              id="contact-title"
              value={title}
              disabled={isPending}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-type">Type</Label>
            <NativeSelect
              id="contact-type"
              className="w-full"
              value={type}
              disabled={isPending}
              onChange={(e) => setType(e.target.value)}
            >
              <NativeSelectOption value="general">General</NativeSelectOption>
              <NativeSelectOption value="billing">Billing</NativeSelectOption>
              <NativeSelectOption value="technical">
                Technical
              </NativeSelectOption>
              <NativeSelectOption value="legal">Legal</NativeSelectOption>
              <NativeSelectOption value="emergency">
                Emergency
              </NativeSelectOption>
              <NativeSelectOption value="other">Other</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>

        <div className="876-card space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="contact-email">Email</Label>
            <Input
              id="contact-email"
              type="email"
              value={email}
              disabled={isPending}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-phone">Phone</Label>
            <Input
              id="contact-phone"
              type="tel"
              value={phone}
              disabled={isPending}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-mobile">Mobile</Label>
            <Input
              id="contact-mobile"
              type="tel"
              value={mobile}
              disabled={isPending}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-notes">Notes</Label>
            <Textarea
              id="contact-notes"
              value={notes}
              disabled={isPending}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="contact-primary"
              checked={isPrimary}
              disabled={isPending}
              onCheckedChange={(checked) => setIsPrimary(!!checked)}
            />
            <Label htmlFor="contact-primary">Primary contact</Label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          {isEdit && (
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>

      {isEdit && (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete contact</AlertDialogTitle>
              <AlertDialogDescription>
                {[contact.first_name, contact.last_name]
                  .filter(Boolean)
                  .join(' ')}{' '}
                will be permanently deleted and cannot be recovered.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                {isPending ? 'Deleting…' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}
