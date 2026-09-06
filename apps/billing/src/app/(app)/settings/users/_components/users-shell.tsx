'use client'
import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailShell, useListDetailRoute } from '@876/ui/list-detail-shell'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
export function UsersShell({ list, children }: { list: ReactNode; children: ReactNode }) {
  const { open } = useListDetailRoute()
  const status = useSearchParams().get('status') ?? 'all'
  return <Page className="h-full min-h-0"><ListDetailShell open={open} toolbar={<ResourceToolbar title="Users" titleFilter={<StatusFilterHeading label="Users" value={status} options={[{ value: 'all', label: 'All users' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }]} />} refresh />} list={list} detail={children} /></Page>
}
