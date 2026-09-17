import type { WorkspaceSessionClient } from '@876/workspace/session'

type MembersResult = Awaited<
  ReturnType<WorkspaceSessionClient['members']['list']>
>
type AppMembershipsResult = Awaited<
  ReturnType<WorkspaceSessionClient['appMemberships']['listForMember']>
>
type RolesResult = Awaited<
  ReturnType<WorkspaceSessionClient['orgAppRoles']['list']>
>

export type OrgMember = NonNullable<MembersResult['data']>['data'][number]
export type AppMembership = NonNullable<
  AppMembershipsResult['data']
>['data'][number]
export type AppRole = NonNullable<RolesResult['data']>['data'][number]
export type AppMembershipCreateInput = Parameters<
  WorkspaceSessionClient['appMemberships']['create']
>[1]
export type AppMembershipUpdateInput = Parameters<
  WorkspaceSessionClient['appMemberships']['update']
>[2]
export type DeletedAppMembership =
  Awaited<
    ReturnType<WorkspaceSessionClient['appMemberships']['delete']>
  > extends { data: infer Data }
    ? Data
    : never
