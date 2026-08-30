'use client'

import { Button } from '@876/ui/button'
import { Mail, Plus } from '@876/ui/icons'

import type { CrmCustomerRow } from './customers-table'

export function CustomerMailsTab({
  customer: _customer,
}: {
  customer: CrmCustomerRow
}) {
  const mails: {
    id: string
    subject: string
    from: string
    to: string
    date: string
    snippet: string
    status: string
  }[] = []

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

      {mails.length === 0 ? (
        <div className="border-876-surface-border bg-muted/10 rounded-xl border p-10 text-center">
          <Mail className="text-muted-foreground/50 mx-auto size-7" />
          <p className="text-foreground mt-2 text-[0.8125rem] font-medium">
            No emails exchanged
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Direct communications and notification history for this customer
            will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {mails.map((msg) => (
            <div
              key={msg.id}
              className="border-876-surface-border bg-muted/20 hover:bg-muted/30 space-y-2.5 rounded-xl border p-4 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-foreground text-[0.8125rem] font-semibold">
                  {msg.subject}
                </p>
                <span className="text-muted-foreground text-xs">
                  {msg.date}
                </span>
              </div>
              <p className="text-muted-foreground text-xs">{msg.snippet}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
