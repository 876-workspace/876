'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@876/ui/tabs'

import type { CustomerBranchOption } from './customer-branch-field'
import {
  CustomerEnrollmentForm,
  type CustomerSelection,
} from './customer-enrollment-form'
import { CustomerForm } from './customer-form'

export function AddCustomerPanel({
  orgSlug,
  branches,
  customers,
}: {
  orgSlug: string
  branches: CustomerBranchOption[] | Promise<CustomerBranchOption[]>
  customers: CustomerSelection | Promise<CustomerSelection>
}) {
  return (
    <Tabs defaultValue="new">
      <TabsList className="mb-4">
        <TabsTrigger value="existing">Existing Billing customer</TabsTrigger>
        <TabsTrigger value="new">New customer</TabsTrigger>
      </TabsList>
      <TabsContent value="existing">
        <CustomerEnrollmentForm
          orgSlug={orgSlug}
          branches={branches}
          customers={customers}
        />
      </TabsContent>
      <TabsContent value="new">
        <CustomerForm orgSlug={orgSlug} branches={branches} />
      </TabsContent>
    </Tabs>
  )
}
