import { Badge } from '@876/ui/badge'
import { Mail, Phone } from '@876/ui/icons'

import type { CrmCustomerRow } from './customer-list'

/**
 * Canonical CRM customer overview body.
 *
 * The record frame is shared separately so hosts can add their own actions and
 * route tabs while keeping the same customer field treatment everywhere.
 */
export function CustomerOverview({ customer }: { customer: CrmCustomerRow }) {
  const isActive = customer.status === 'ACTIVE'

  return (
    <div className="space-y-4">
      <div className="border-876-surface-border bg-muted/20 space-y-3 rounded-xl border p-4">
        <h3 className="text-muted-foreground text-[0.8125rem] font-semibold">
          {customer.isBusiness ? 'Organization Details' : 'Customer Details'}
        </h3>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {customer.legalName ? (
            <div>
              <dt className="text-muted-foreground text-xs">Legal Name</dt>
              <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium">
                {customer.legalName}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted-foreground flex items-center gap-1 text-xs">
              <Mail className="size-3 shrink-0" />
              Email
            </dt>
            <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium">
              {customer.email ? (
                <a
                  href={`mailto:${customer.email}`}
                  className="hover:underline"
                >
                  {customer.email}
                </a>
              ) : (
                <span className="text-muted-foreground/60">—</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground flex items-center gap-1 text-xs">
              <Phone className="size-3 shrink-0" />
              Phone
            </dt>
            <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium">
              {customer.phone ? (
                <a href={`tel:${customer.phone}`} className="hover:underline">
                  {customer.phone}
                </a>
              ) : (
                <span className="text-muted-foreground/60">—</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Type</dt>
            <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium">
              {customer.isBusiness ? 'Business' : 'Individual'}
            </dd>
          </div>
          {customer.typeLabel ? (
            <div>
              <dt className="text-muted-foreground text-xs">Source</dt>
              <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium">
                {customer.typeLabel}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      {customer.isBusiness ? (
        <div className="border-876-surface-border bg-muted/20 space-y-3 rounded-xl border p-4">
          <h3 className="text-muted-foreground text-[0.8125rem] font-semibold">
            Primary Contact
          </h3>
          {customer.contactName ? (
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground text-xs">Contact Name</dt>
                <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium">
                  {customer.contactName}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Mail className="size-3 shrink-0" />
                  Contact Email
                </dt>
                <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium">
                  {customer.contactEmail ? (
                    <a
                      href={`mailto:${customer.contactEmail}`}
                      className="hover:underline"
                    >
                      {customer.contactEmail}
                    </a>
                  ) : (
                    <span className="text-muted-foreground/60">—</span>
                  )}
                </dd>
              </div>
              {customer.contactPhone ? (
                <div>
                  <dt className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Phone className="size-3 shrink-0" />
                    Contact Phone
                  </dt>
                  <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium">
                    <a
                      href={`tel:${customer.contactPhone}`}
                      className="hover:underline"
                    >
                      {customer.contactPhone}
                    </a>
                  </dd>
                </div>
              ) : null}
              {customer.contactUserId ? (
                <div>
                  <dt className="text-muted-foreground text-xs">876 Account</dt>
                  <dd className="text-foreground mt-0.5 font-mono text-[0.8125rem]">
                    {customer.contactUserId}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="text-muted-foreground text-xs">
              No primary contact on file
            </p>
          )}
        </div>
      ) : null}

      <div className="border-876-surface-border bg-muted/20 space-y-3 rounded-xl border p-4">
        <h3 className="text-muted-foreground text-[0.8125rem] font-semibold">
          CRM Record
        </h3>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-xs">Registry ID</dt>
            <dd className="text-foreground mt-0.5 font-mono text-[0.8125rem]">
              {customer.billingCustomerId ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">CRM Status</dt>
            <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium">
              <Badge variant={isActive ? 'success' : 'secondary'}>
                {isActive ? 'Active' : 'Inactive'}
              </Badge>
            </dd>
          </div>
          {customer.ownerId ? (
            <div>
              <dt className="text-muted-foreground text-xs">Owner ID</dt>
              <dd className="text-foreground mt-0.5 font-mono text-[0.8125rem]">
                {customer.ownerId}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    </div>
  )
}
