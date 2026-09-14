'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@876/ui/alert-dialog'
import { Alert, AlertDescription } from '@876/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardIdBar,
} from '@876/ui/detail-card'
import { Activity, TriangleAlertIcon } from '@876/ui/icons'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@876/ui/tabs'

import { client } from '@/lib/client'
import type { TeamMemberRow, TeamRoleOption } from '@/types/team'

import { memberInitials } from '../_lib/member-initials'
import { UserPermissionsSummary } from './user-permissions-summary'

/** In-panel tab chrome matching RouteTabs line look. */
const detailTabTriggerClass =
  'group/tab relative h-auto flex-none rounded-none border-0 bg-transparent px-3 py-2.5 text-[0.8125rem] font-medium shadow-none ' +
  'text-muted-foreground hover:text-foreground ' +
  '!after:hidden ' +
  'data-active:!bg-transparent data-active:text-876-accent-fg data-active:!shadow-none ' +
  'dark:data-active:!bg-transparent dark:data-active:text-876-accent-fg'

type Props = {
  row: TeamMemberRow
  roles: TeamRoleOption[]
  orgSlug: string
  closeHref: string
}

/** The member record filling the split view's detail column. */
export function UserDetailCard({ row, roles, orgSlug, closeHref }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const roleOptions = useMemo(
    () => roles.map((role) => ({ value: role.id, label: role.name })),
    [roles]
  )
  const listHref = `/${orgSlug}/settings/users`

  function update(params: { roleId?: string; status?: 'active' | 'inactive' }) {
    setError(null)
    startTransition(async () => {
      const result = await client.team.update(orgSlug, row.id, params)
      if (result.error) {
        setError(result.error.message)
        return
      }

      router.refresh()
    })
  }

  function remove() {
    setError(null)
    startTransition(async () => {
      const result = await client.team.delete(orgSlug, row.id)
      if (result.error) {
        setError(result.error.message)
        setRemoveOpen(false)
        return
      }

      setRemoveOpen(false)
      router.push(listHref)
      router.refresh()
    })
  }

  const role = roles.find((candidate) => candidate.id === row.roleId)
  const isActive = row.status === 'active'

  return (
    <DetailCard aria-label={`Member details: ${row.name}`}>
      <DetailCardHeader
        icon={
          <Avatar size="lg" className="size-12 shrink-0">
            {row.avatar ? <AvatarImage src={row.avatar} alt="" /> : null}
            <AvatarFallback>{memberInitials(row.name)}</AvatarFallback>
          </Avatar>
        }
        title={row.name}
        subtitle={row.email ?? 'No email available'}
        meta={
          <Badge variant={isActive ? 'success' : 'secondary'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        }
        closeHref={closeHref}
        closeLabel="Close user details"
      />
      <DetailCardBody className="p-0">
        <Tabs defaultValue="overview" className="gap-0">
          <div className="px-5">
            <TabsList className="h-auto w-full justify-start gap-1 rounded-none !bg-transparent p-0">
              <TabsTrigger value="overview" className={detailTabTriggerClass}>
                Overview
                <TabUnderline />
              </TabsTrigger>
              <TabsTrigger
                value="permissions"
                className={detailTabTriggerClass}
              >
                Permissions
                <TabUnderline />
              </TabsTrigger>
              <TabsTrigger value="activity" className={detailTabTriggerClass}>
                Activity
                <TabUnderline />
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-0 space-y-5 p-5">
            {error ? (
              <Alert variant="destructive">
                <TriangleAlertIcon />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-[6.5rem_1fr] sm:items-center sm:gap-4">
                <span className="text-muted-foreground text-[0.8125rem]">
                  Role
                </span>
                <Select
                  value={row.roleId}
                  disabled={isPending}
                  onValueChange={(value) => value && update({ roleId: value })}
                  items={roleOptions}
                >
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2 sm:grid-cols-[6.5rem_1fr] sm:items-center sm:gap-4">
                <span className="text-muted-foreground text-[0.8125rem]">
                  Status
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  className="w-fit"
                  onClick={() =>
                    update({
                      status: isActive ? 'inactive' : 'active',
                    })
                  }
                >
                  {isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={() => setRemoveOpen(true)}
              >
                Remove
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="mt-0 p-5">
            <UserPermissionsSummary role={role} />
          </TabsContent>

          <TabsContent value="activity" className="mt-0 p-5">
            <ActivityEmpty />
          </TabsContent>
        </Tabs>
      </DetailCardBody>
      <DetailCardIdBar>{row.id}</DetailCardIdBar>

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove user?</AlertDialogTitle>
            <AlertDialogDescription>
              {row.name} will lose access to this Couriers organization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={remove}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DetailCard>
  )
}

function TabUnderline() {
  return (
    <span
      aria-hidden
      className="bg-876-accent-fg pointer-events-none absolute inset-x-0 bottom-0 h-0.5 opacity-0 transition-opacity group-aria-selected/tab:opacity-100"
    />
  )
}

function ActivityEmpty() {
  return (
    <div className="border-876-surface-border flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
      <span className="text-muted-foreground bg-muted/40 mb-3 flex size-10 items-center justify-center rounded-xl border">
        <Activity aria-hidden="true" className="size-5" />
      </span>
      <p className="text-[0.8125rem] font-medium">No activity</p>
    </div>
  )
}
