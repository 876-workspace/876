/** @vitest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { DocumentEmailComposition } from '@876/billing'

import { DocumentEmailComposer } from './document-email-composer'

const composition: DocumentEmailComposition = {
  object: 'document_email_composition',
  resourceType: 'invoice',
  resourceId: 'inv_1',
  sender: {
    id: 'sender_1',
    name: 'Acme Billing',
    email: 'billing@example.com',
    replyTo: null,
  },
  senderOptions: [
    {
      id: 'sender_1',
      name: 'Acme Billing',
      email: 'billing@example.com',
      replyTo: null,
      isDefault: true,
    },
    {
      id: 'sender_2',
      name: 'Acme Accounts',
      email: 'accounts@example.com',
      replyTo: null,
      isDefault: false,
    },
  ],
  to: [{ email: 'ada@example.com', name: 'Ada' }],
  cc: [],
  bcc: [],
  templateId: 'template_1',
  templateOptions: [
    {
      id: 'template_1',
      name: 'Invoice default',
      isDefault: true,
      isSystem: true,
      senderId: null,
    },
    {
      id: 'template_2',
      name: 'Invoice reminder',
      isDefault: false,
      isSystem: false,
      senderId: 'sender_2',
    },
  ],
  subject: 'Invoice INV-001',
  html: '<p>Your invoice is ready.</p>',
  text: 'Your invoice is ready.',
}

const delivery = {
  object: 'document_email_delivery' as const,
  resourceType: 'invoice' as const,
  resourceId: 'inv_1',
  deliveryId: 'delivery_1',
  providerMessageId: 'message_1',
  status: 'sent',
  sentAt: 100,
}

describe('DocumentEmailComposer', () => {
  it('loads and renders the canonical composition when opened', async () => {
    const prepare = vi.fn(async () => ({ data: composition, error: null }))

    render(
      <DocumentEmailComposer
        open
        onOpenChange={vi.fn()}
        documentLabel="invoice"
        prepare={prepare}
        send={vi.fn()}
      />
    )

    expect(
      await screen.findByRole('heading', { name: 'Send invoice by email' })
    ).toBeInTheDocument()
    expect(prepare).toHaveBeenCalledWith({})
    expect(screen.getByLabelText('To')).toHaveValue('ada@example.com')
    expect(screen.getByLabelText('Subject')).toHaveValue('Invoice INV-001')
    expect(screen.getByLabelText('Message')).toHaveValue(
      'Your invoice is ready.'
    )
  })

  it('re-prepares the composition when a different template is selected', async () => {
    const user = userEvent.setup()
    const reminder = {
      ...composition,
      templateId: 'template_2',
      sender: composition.senderOptions[1]!,
      subject: 'Reminder: Invoice INV-001',
      text: 'A friendly reminder.',
      html: '<p>A friendly reminder.</p>',
    }
    const prepare = vi
      .fn()
      .mockResolvedValueOnce({ data: composition, error: null })
      .mockResolvedValueOnce({ data: reminder, error: null })

    render(
      <DocumentEmailComposer
        open
        onOpenChange={vi.fn()}
        documentLabel="invoice"
        prepare={prepare}
        send={vi.fn()}
      />
    )

    const template = await screen.findByLabelText('Template')
    await user.selectOptions(template, 'template_2')

    await waitFor(() =>
      expect(prepare).toHaveBeenLastCalledWith({ templateId: 'template_2' })
    )
    expect(await screen.findByLabelText('Subject')).toHaveValue(
      'Reminder: Invoice INV-001'
    )
  })

  it('sends edited recipients and safely generated html for an edited message', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const send = vi.fn(async () => ({ data: delivery, error: null }))

    render(
      <DocumentEmailComposer
        open
        onOpenChange={onOpenChange}
        documentLabel="invoice"
        prepare={async () => ({ data: composition, error: null })}
        send={send}
      />
    )

    await user.clear(await screen.findByLabelText('To'))
    await user.type(screen.getByLabelText('To'), 'one@example.com, two@example.com')
    await user.clear(screen.getByLabelText('Message'))
    await user.type(screen.getByLabelText('Message'), 'Hello <Ada>\nThanks & regards')
    await user.click(screen.getByRole('button', { name: 'Send email' }))

    await waitFor(() => expect(send).toHaveBeenCalledTimes(1))
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: [{ email: 'one@example.com' }, { email: 'two@example.com' }],
        text: 'Hello <Ada>\nThanks & regards',
        html: '<p>Hello &lt;Ada&gt;<br>Thanks &amp; regards</p>',
      })
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('keeps a send failure inline and leaves the composer open', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    render(
      <DocumentEmailComposer
        open
        onOpenChange={onOpenChange}
        documentLabel="invoice"
        prepare={async () => ({ data: composition, error: null })}
        send={async () => ({
          data: null,
          error: { message: 'Email delivery is temporarily unavailable.' },
        })}
      />
    )

    await screen.findByLabelText('To')
    await user.click(screen.getByRole('button', { name: 'Send email' }))

    expect(
      await screen.findByText('Email delivery is temporarily unavailable.')
    ).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })
})
