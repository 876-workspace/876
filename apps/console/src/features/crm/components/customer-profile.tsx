import { Badge } from '@876/ui/badge'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { Building2, Mail, Phone, User } from '@876/ui/icons'
import { formatDate } from '@876/core/timestamps'

import type { CustomerIdentity } from '../customer-identity'

type Props = {
  identity: CustomerIdentity
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: number
}

/**
 * The customer's identity band.
 *
 * The party and the person are rendered as two labelled things, never merged.
 * A business customer shows the company on top and its primary contact beneath
 * it, so nobody reads an owner's personal address as the company's own.
 */
export function CustomerProfileCard({ identity, status, createdAt }: Props) {
  return (
    <div className="876-card p-5">
      <div className="flex flex-wrap items-start gap-4">
        <CustomerAvatar name={identity.name} className="size-12 text-base" />

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="876-page-title min-w-0 truncate">{identity.name}</h1>
            <Badge variant={status === 'ACTIVE' ? 'success' : 'secondary'}>
              {status === 'ACTIVE' ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          {identity.legalName ? (
            <p className="text-muted-foreground text-[0.8125rem]">
              Legally {identity.legalName}
            </p>
          ) : null}

          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem]">
            <span className="flex items-center gap-1.5">
              {identity.isBusiness ? (
                <Building2 className="size-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <User className="size-3.5 shrink-0" aria-hidden="true" />
              )}
              {identity.typeLabel}
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <Mail className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{identity.email ?? '—'}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="size-3.5 shrink-0" aria-hidden="true" />
              {identity.phone ?? '—'}
            </span>
            <span>Customer since {formatDate(createdAt)}</span>
          </div>
        </div>
      </div>

      {identity.contact ? (
        <div className="mt-4 border-t pt-4">
          <p className="text-muted-foreground text-[0.6875rem] tracking-wide uppercase">
            Primary contact
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem]">
            <span className="font-medium">{identity.contact.name}</span>
            <span className="text-muted-foreground flex min-w-0 items-center gap-1.5">
              <Mail className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{identity.contact.email ?? '—'}</span>
            </span>
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Phone className="size-3.5 shrink-0" aria-hidden="true" />
              {identity.contact.phone ?? '—'}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
