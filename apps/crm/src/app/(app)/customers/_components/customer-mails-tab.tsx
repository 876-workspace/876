'use client'

import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { Mail, Plus } from '@876/ui/icons'

import type { CrmCustomerRow } from './customers-table'

export function CustomerMailsTab({ customer }: { customer: CrmCustomerRow }) {
  const targetEmail =
    customer.contactEmail ?? customer.email ?? 'customer@example.com'

  const mails = [
    {
      id: 'msg_003',
      subject: 'Re: Invoice #INV-2026-003 Payment Confirmation & Receipt',
      from: 'billing@876.io',
      to: targetEmail,
      date: 'Aug 24, 2026 at 10:30 AM',
      snippet:
        'Thank you for your payment of $5,800.00. Your receipt and updated statement of account have been issued and attached.',
      status: 'Delivered',
    },
    {
      id: 'msg_002',
      subject: 'Monthly Account Statement — July 2026',
      from: 'accounts@876.io',
      to: targetEmail,
      date: 'Aug 01, 2026 at 9:00 AM',
      snippet:
        'Please find your monthly billing statement summary for July 2026. If you have any questions regarding usage charges, please contact your account manager.',
      status: 'Opened',
    },
    {
      id: 'msg_001',
      subject: 'Welcome to 876 CRM Platform',
      from: 'support@876.io',
      to: targetEmail,
      date: 'Jun 10, 2026 at 2:15 PM',
      snippet:
        'Welcome aboard! Your workspace has been provisioned and your team is ready to manage communications and workflows.',
      status: 'Opened',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-foreground text-[0.8125rem] font-semibold">
          Communication History ({mails.length})
        </h3>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Plus className="size-3.5" />
          Compose Email
        </Button>
      </div>

      <div className="space-y-3">
        {mails.map((msg) => (
          <div
            key={msg.id}
            className="border-876-surface-border bg-muted/20 hover:bg-muted/30 space-y-2.5 rounded-xl border p-4 transition-colors"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 text-primary flex size-6 items-center justify-center rounded-md">
                  <Mail className="size-3.5" />
                </div>
                <p className="text-foreground text-[0.8125rem] font-semibold">
                  {msg.subject}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[0.625rem]">
                  {msg.status}
                </Badge>
                <span className="text-muted-foreground text-xs">
                  {msg.date}
                </span>
              </div>
            </div>

            <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
              {msg.snippet}
            </p>

            <div className="border-876-surface-border text-muted-foreground flex items-center justify-between border-t pt-2 text-[0.6875rem]">
              <span>
                From:{' '}
                <strong className="text-foreground font-medium">
                  {msg.from}
                </strong>
              </span>
              <span>
                To:{' '}
                <strong className="text-foreground font-medium">
                  {msg.to}
                </strong>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
