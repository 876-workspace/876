'use client'

import { useState } from 'react'

import type { EmailDomainRecord } from '@876/communications/contracts'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@876/ui/card'
import { Copy } from '@876/ui/icons'
import { Skeleton } from '@876/ui/skeleton'

export type DomainRecordsPanelState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; error: { code: string; message: string } }
  | { status: 'ready'; data: EmailDomainRecord[] }

export interface DomainRecordsPanelProps {
  state: DomainRecordsPanelState
  domainName: string
  domainId: string
  baseHref: string
}

function purposeLabel(purpose: string | undefined) {
  const normalized = (purpose ?? '').trim()
  return normalized === '' ? 'Other' : normalized
}

function groupRecords(records: EmailDomainRecord[]) {
  const groups = new Map<string, EmailDomainRecord[]>()
  for (const record of records) {
    const label = purposeLabel(record.purpose)
    const list = groups.get(label)
    if (list) list.push(record)
    else groups.set(label, [record])
  }
  return [...groups.entries()].sort(([a], [b]) => {
    if (a === 'Other') return 1
    if (b === 'Other') return -1
    return a.localeCompare(b)
  })
}

async function copyValue(value: string) {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
    }
  } catch {
    // Clipboard is best-effort; the value stays visible for manual copy.
  }
}

/** One domain's DNS records to publish, grouped by purpose. */
export function DomainRecordsPanel({
  state,
  domainName,
  domainId,
  baseHref,
}: DomainRecordsPanelProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  return (
    <section aria-label={`DNS records for ${domainName}`}>
      <Card>
        <CardHeader>
          <CardTitle>
            <a
              href={`${baseHref}/domains/${domainId}`}
              className="font-medium hover:underline"
            >
              {domainName}
            </a>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {state.status === 'loading' ? (
            <div
              aria-label={`Loading DNS records for ${domainName}`}
              className="space-y-3"
            >
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : state.status === 'empty' ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              No DNS records for this domain yet.
            </p>
          ) : state.status === 'error' ? (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/5 rounded-lg border p-4 text-sm"
            >
              <p className="font-medium">DNS records could not be loaded</p>
              <p className="text-muted-foreground mt-1">
                {state.error.message}
              </p>
              <p className="text-muted-foreground mt-2 font-mono text-xs">
                {state.error.code}
              </p>
            </div>
          ) : state.data.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              No DNS records for this domain yet.
            </p>
          ) : (
            <div className="space-y-6">
              {groupRecords(state.data).map(([purpose, records]) => (
                <div key={purpose}>
                  <h3 className="text-sm font-medium">{purpose}</h3>
                  <ul className="mt-3 space-y-3">
                    {records.map((record, index) => {
                      const key = `${purpose}-${record.name}-${record.type}-${index}`
                      const copied = copiedKey === key
                      return (
                        <li
                          key={key}
                          className="border-border rounded-lg border px-4 py-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-muted-foreground text-xs">
                              {record.name}
                            </span>
                            <Badge variant="outline">{record.type}</Badge>
                          </div>
                          <p className="mt-2 font-mono text-xs break-all">
                            {record.value}
                          </p>
                          <div className="mt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              aria-label={`Copy ${purpose} ${record.type} record value`}
                              onClick={() => {
                                void copyValue(record.value).then(() =>
                                  setCopiedKey(key)
                                )
                              }}
                            >
                              <Copy className="size-3.5" />
                              {copied ? 'Copied' : 'Copy'}
                            </Button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

export function DomainRecordsPanelSkeleton({
  domainName,
}: {
  domainName: string
}) {
  return (
    <section aria-label={`DNS records for ${domainName}`}>
      <Card>
        <CardHeader>
          <CardTitle>{domainName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            aria-label={`Loading DNS records for ${domainName}`}
            className="space-y-3"
          >
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
