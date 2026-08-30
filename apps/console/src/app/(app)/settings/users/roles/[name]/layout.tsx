import { Suspense, type ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { Skeleton } from '@876/ui/skeleton'

import { RoleCardFrame } from '../_components/role-card-frame'
import { getRole } from './_data'

export default async function RoleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ name: string }>
}) {
  const { name } = await params

  return (
    <Suspense key={name} fallback={<RoleCardFallback />}>
      <RoleCard name={name}>{children}</RoleCard>
    </Suspense>
  )
}

async function RoleCard({
  name,
  children,
}: {
  name: string
  children: ReactNode
}) {
  const role = await getRole(name)
  if (!role) notFound()

  return (
    <RoleCardFrame
      role={{
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        permissions: role.permissions,
        isSystem: role.isSystem,
        userCount: role._count.members,
      }}
    >
      {children}
    </RoleCardFrame>
  )
}

function RoleCardFallback() {
  return (
    <div className="876-card h-full p-6">
      <Skeleton className="h-16 w-64" />
    </div>
  )
}
