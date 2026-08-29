import { getError, isError } from '@876/core'
import type {
  AddTeamMemberInput,
  CreateTeamInput,
  DeleteTeamInput,
  ListTeamsInput,
  UpdateTeamInput,
  UpdateTeamMemberInput,
} from '../../types/team.js'
import * as tenants from '../tenants/tenants.service.js'
import * as repository from './teams.repository.js'

type TeamRow = Awaited<ReturnType<typeof repository.list>>[number]
type TeamWithMembersRow = NonNullable<Awaited<ReturnType<typeof repository.retrieve>>>
type MemberRow = Awaited<ReturnType<typeof repository.listMembers>>[number]

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'team'
  )
}

async function requireTenant(organizationId: string) {
  const tenant = await tenants.retrieveByOrganization(organizationId)
  if (!tenant) return getError('crm/tenant-not-found')
  if (tenant.status !== 'ACTIVE') return getError('crm/tenant-inactive')
  return tenant
}

function serializeMember(memberRow: MemberRow) {
  return {
    object: 'team_member' as const,
    id: memberRow.id,
    tenantId: memberRow.tenantId,
    teamId: memberRow.teamId,
    userId: memberRow.userId,
    role: memberRow.role,
    addedBy: memberRow.addedBy,
    createdAt: Math.floor(memberRow.createdAt.getTime() / 1000),
    updatedAt: Math.floor(memberRow.updatedAt.getTime() / 1000),
  }
}

function serialize(team: TeamRow | TeamWithMembersRow) {
  return {
    object: 'team' as const,
    id: team.id,
    tenantId: team.tenantId,
    name: team.name,
    slug: team.slug,
    description: team.description,
    color: team.color,
    isDefault: team.isDefault,
    autoAssign: team.autoAssign,
    status: team.status,
    createdBy: team.createdBy,
    createdAt: Math.floor(team.createdAt.getTime() / 1000),
    updatedAt: Math.floor(team.updatedAt.getTime() / 1000),
    ...('members' in team ? { members: team.members.map(serializeMember) } : {}),
  }
}

export async function list(organizationId: string, input: ListTeamsInput) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant

  const teams = input.includeMembers
    ? await repository.listWithMembers(tenant.id, input.status)
    : await repository.list(tenant.id, input.status)

  return teams.map(serialize)
}

export async function retrieve(organizationId: string, id: string) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const team = await repository.retrieve(tenant.id, id)
  return team ? serialize(team) : null
}

export async function create(organizationId: string, input: CreateTeamInput) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const team = await repository.create({
    tenantId: tenant.id,
    ...input,
    slug: slugify(input.name),
  })
  return serialize(team)
}

export async function update(
  organizationId: string,
  id: string,
  input: UpdateTeamInput
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const team = await repository.retrieve(tenant.id, id)
  if (!team) return null
  const row = await repository.update(id, { tenantId: tenant.id, ...input })
  return serialize(row)
}

export async function remove(
  organizationId: string,
  id: string,
  input: DeleteTeamInput
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const team = await repository.retrieve(tenant.id, id)
  if (!team) return null
  return repository.remove({ tenantId: tenant.id, id, ...input })
}

export async function listMembers(organizationId: string, id: string) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const team = await repository.retrieve(tenant.id, id)
  if (!team) return null
  const members = await repository.listMembers(tenant.id, id)
  return members.map(serializeMember)
}

export async function addMember(
  organizationId: string,
  id: string,
  input: AddTeamMemberInput
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const team = await repository.retrieve(tenant.id, id)
  if (!team) return null
  const memberRow = await repository.upsertMember({
    tenantId: tenant.id,
    teamId: id,
    ...input,
  })
  return serializeMember(memberRow)
}

export async function changeMember(
  organizationId: string,
  id: string,
  userId: string,
  input: UpdateTeamMemberInput
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const team = await repository.retrieve(tenant.id, id)
  if (!team) return null
  const memberRow = await repository.retrieveMember(tenant.id, id, userId)
  if (!memberRow) return null
  const row = await repository.updateMember(tenant.id, id, userId, input.role)
  return serializeMember(row)
}

export async function removeMember(
  organizationId: string,
  id: string,
  userId: string
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const team = await repository.retrieve(tenant.id, id)
  if (!team) return null
  const memberRow = await repository.retrieveMember(tenant.id, id, userId)
  if (!memberRow) return null
  await repository.removeMember(tenant.id, id, userId)
  return { object: 'team_member' as const, id: userId, deleted: true as const }
}
