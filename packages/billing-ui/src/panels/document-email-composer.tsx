'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'

import type {
  DocumentEmailComposition,
  DocumentEmailDelivery,
  DocumentEmailPrepareParams,
  DocumentEmailRecipient,
  DocumentEmailSendParams,
} from '@876/billing'
import { AppError } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@876/ui/dialog'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'

type ComposerResult<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } }

export interface DocumentEmailComposerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentLabel: 'invoice' | 'quote'
  prepare: (
    params: DocumentEmailPrepareParams
  ) => Promise<ComposerResult<DocumentEmailComposition>>
  send: (
    params: DocumentEmailSendParams
  ) => Promise<ComposerResult<DocumentEmailDelivery>>
  onSent?: (delivery: DocumentEmailDelivery) => void
}

function recipientsToInput(recipients: DocumentEmailRecipient[]): string {
  return recipients.map((recipient) => recipient.email).join(', ')
}

function parseRecipients(value: string): DocumentEmailRecipient[] {
  return value
    .split(/[,;\n]+/)
    .map((email) => email.trim())
    .filter(Boolean)
    .map((email) => ({ email }))
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function plainTextToHtml(value: string): string {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll('\n', '<br>')}</p>`)
    .join('')
}

export function DocumentEmailComposer({
  open,
  onOpenChange,
  documentLabel,
  prepare,
  send,
  onSent,
}: DocumentEmailComposerProps) {
  const [composition, setComposition] =
    useState<DocumentEmailComposition | null>(null)
  const [senderId, setSenderId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [bodyDirty, setBodyDirty] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const applyComposition = useCallback((next: DocumentEmailComposition) => {
    setComposition(next)
    setSenderId(next.sender.id)
    setTemplateId(next.templateId ?? '')
    setTo(recipientsToInput(next.to))
    setCc(recipientsToInput(next.cc))
    setBcc(recipientsToInput(next.bcc))
    setSubject(next.subject)
    setBody(next.text ?? '')
    setBodyDirty(false)
  }, [])

  const load = useCallback(
    async (params: DocumentEmailPrepareParams) => {
      setLoading(true)
      setError(null)
      const result = await prepare(params)
      setLoading(false)
      if (result.error || !result.data) {
        setError(result.error?.message ?? `Failed to prepare the ${documentLabel} email.`)
        return
      }
      applyComposition(result.data)
    },
    [applyComposition, documentLabel, prepare]
  )

  useEffect(() => {
    if (!open) {
      setComposition(null)
      setError(null)
      return
    }
    void load({})
  }, [load, open])

  function submit() {
    if (!composition) return

    const recipients = parseRecipients(to)
    if (recipients.length === 0) {
      setError('Add at least one recipient.')
      return
    }
    if (!subject.trim()) {
      setError('Add a subject.')
      return
    }
    if (bodyDirty && !body.trim()) {
      setError('Add a message.')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await send({
        senderId,
        templateId: templateId || null,
        to: recipients,
        cc: parseRecipients(cc),
        bcc: parseRecipients(bcc),
        subject: subject.trim(),
        html: bodyDirty ? plainTextToHtml(body) : composition.html,
        text: bodyDirty ? body : composition.text,
      })
      if (result.error || !result.data) {
        setError(result.error?.message ?? `Failed to send the ${documentLabel}.`)
        return
      }
      onOpenChange(false)
      onSent?.(result.data)
    })
  }

  const busy = loading || pending
  const title = `Send ${documentLabel} by email`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Review the sender, recipients, template, subject, and message before
            sending.
          </DialogDescription>
        </DialogHeader>

        {loading && !composition ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Preparing email…
          </p>
        ) : composition ? (
          <div className="grid gap-4 py-1">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="document-email-sender">From</Label>
                <NativeSelect
                  id="document-email-sender"
                  className="w-full"
                  value={senderId}
                  disabled={busy}
                  onChange={(event) => setSenderId(event.target.value)}
                >
                  {composition.senderOptions.map((sender) => (
                    <NativeSelectOption key={sender.id} value={sender.id}>
                      {sender.name} · {sender.email}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-2">
                <Label htmlFor="document-email-template">Template</Label>
                <NativeSelect
                  id="document-email-template"
                  className="w-full"
                  value={templateId}
                  disabled={busy}
                  onChange={(event) => {
                    const nextTemplateId = event.target.value
                    setTemplateId(nextTemplateId)
                    void load({ templateId: nextTemplateId })
                  }}
                >
                  {composition.templateOptions.map((template) => (
                    <NativeSelectOption key={template.id} value={template.id}>
                      {template.name}
                      {template.isSystem ? ' · System' : ''}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="document-email-to">To</Label>
              <Input
                id="document-email-to"
                value={to}
                disabled={busy}
                onChange={(event) => setTo(event.target.value)}
                placeholder="customer@example.com"
                inputMode="email"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="document-email-cc">CC</Label>
                <Input
                  id="document-email-cc"
                  value={cc}
                  disabled={busy}
                  onChange={(event) => setCc(event.target.value)}
                  placeholder="Optional"
                  inputMode="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="document-email-bcc">BCC</Label>
                <Input
                  id="document-email-bcc"
                  value={bcc}
                  disabled={busy}
                  onChange={(event) => setBcc(event.target.value)}
                  placeholder="Optional"
                  inputMode="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="document-email-subject">Subject</Label>
              <Input
                id="document-email-subject"
                value={subject}
                disabled={busy}
                onChange={(event) => setSubject(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="document-email-body">Message</Label>
              <Textarea
                id="document-email-body"
                value={body}
                disabled={busy}
                rows={10}
                onChange={(event) => {
                  setBody(event.target.value)
                  setBodyDirty(true)
                }}
              />
              {!bodyDirty ? (
                <p className="text-muted-foreground text-xs">
                  The template HTML is preserved until you edit this message.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {error ? (
          <AppError
            error={{ code: 'billing/email-composer-failed', message: error }}
            variant="form"
          />
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="info"
            disabled={busy || !composition}
            onClick={submit}
          >
            {pending ? 'Sending…' : 'Send email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
