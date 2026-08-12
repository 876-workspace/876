'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@876/ui/tabs'

import type { GlobalCustomerOption } from '@/types/customer'

import type { CustomerBranchOption } from './customer-branch-field'
import { CustomerEnrollmentForm } from './customer-enrollment-form'
import { CustomerForm } from './customer-form'

export function AddCustomerPanel({
  orgSlug,
  branches,
  globalCustomers,
  selectionError,
}: {
  orgSlug: string
  branches: CustomerBranchOption[]
  globalCustomers: GlobalCustomerOption[]
  selectionError: string | null
}) {
  return (
    <Tabs
      defaultValue={
        !selectionError && globalCustomers.length > 0 ? 'existing' : 'new'
      }
    >
      <TabsList className="mb-4">
        <TabsTrigger value="existing">Existing Billing customer</TabsTrigger>
        <TabsTrigger value="new">New customer</TabsTrigger>
      </TabsList>
      <TabsContent value="existing">
        <CustomerEnrollmentForm
          orgSlug={orgSlug}
          branches={branches}
          customers={globalCustomers}
          loadError={selectionError}
        />
      </TabsContent>
      <TabsContent value="new">
        <CustomerForm orgSlug={orgSlug} branches={branches} />
      </TabsContent>
    </Tabs>
  )
}
