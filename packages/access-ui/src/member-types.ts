export type OrgMember = {
  object: 'organization_member'
  id: string
  user_id: string
  role: string
  role_id: string | null
  position: string | null
  status: string
  first_name: string | null
  last_name: string | null
  email: string | null
  avatar: string | null
  created_at: number
}

export type AppMembership = {
  id: string
  app_id: string
  app_slug: string
  app_name: string
  entitled: boolean
  assigned: boolean
  status: string
  app_role: AppRole | null
  permission_grants: string[]
  permission_denies: string[]
  effective_permissions: string[]
}

export type AppRole = {
  id: string
  key: string
  name: string
  description: string | null
  permissions: string[]
  is_system: boolean
  is_default: boolean
}
