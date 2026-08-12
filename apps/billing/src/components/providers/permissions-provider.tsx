'use client'

import { createContext, useContext, type ReactNode } from 'react'

import type { Permission } from '@/types/access'

const BillingPermissionsContext = createContext<ReadonlySet<Permission> | null>(
  null
)

export function BillingPermissionsProvider({
  children,
  permissions,
}: {
  children: ReactNode
  permissions: Permission[]
}) {
  return (
    <BillingPermissionsContext.Provider value={new Set(permissions)}>
      {children}
    </BillingPermissionsContext.Provider>
  )
}

export function useBillingPermission(permission: Permission): boolean {
  return useContext(BillingPermissionsContext)?.has(permission) ?? false
}
