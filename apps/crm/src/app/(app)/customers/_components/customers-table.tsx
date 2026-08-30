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

import type { CrmCustomerRow } from '@/features/customers/types'
import { CustomerTableRow } from './customer-row'

interface Props {
  customers: CrmCustomerRow[]
}

export function CustomersTable({ customers }: Props) {
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
                      href="/customers/new"
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
              <CustomerTableRow key={customer.profileId} customer={customer} />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
