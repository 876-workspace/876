'use client'

import * as React from 'react'
import Link from 'next/link'
import { buttonVariants } from '@876/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Plus, UsersIcon } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { CustomerTableRow } from './customer-row'

export type CrmCustomerRow = {
  profileId: string
  billingCustomerId: string
  /** The party's name — the company for a business, the person otherwise. */
  name: string
  legalName?: string | null
  isBusiness: boolean
  typeLabel?: string
  /** The party's own email/phone. For a business, never the contact's. */
  email: string | null
  phone: string | null
  /** The person attached to a business customer. Null for an individual. */
  contactName: string | null
  contactEmail: string | null
  contactPhone?: string | null
  contactUserId?: string | null
  contactAvatar?: string | null
  ownerId?: string | null
  status: 'ACTIVE' | 'INACTIVE'
  createdAt?: number
  updatedAt?: number
}

interface Props {
  customers: CrmCustomerRow[]
  onSelect?: (id: string) => void
}

export function CustomersTable({ customers, onSelect = () => {} }: Props) {
  return (
    <div className="876-card overflow-hidden">
      <Table>
        <TableHeader className="876-header-row">
          <TableRow>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Customer
            </TableHead>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Contact
            </TableHead>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Phone
            </TableHead>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Status
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="p-0">
                <Empty className="py-14">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <UsersIcon className="size-6" />
                    </EmptyMedia>
                    <EmptyTitle>No customers yet</EmptyTitle>
                  </EmptyHeader>
                  <EmptyContent>
                    <Link
                      href="/customers?customer=new"
                      className={buttonVariants({
                        variant: 'info',
                        size: 'sm',
                      })}
                    >
                      <Plus className="size-4" strokeWidth={2.25} />
                      Add
                    </Link>
                  </EmptyContent>
                </Empty>
              </TableCell>
            </TableRow>
          ) : (
            customers.map((customer) => (
              <CustomerTableRow
                key={customer.profileId}
                customer={customer}
                onSelect={onSelect}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
