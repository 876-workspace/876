import type { AdminApplicationModule, AdminResult } from '@876/platform/compat'

export type PlanModuleOption = Pick<
  AdminApplicationModule,
  'id' | 'key' | 'name' | 'description' | 'feature_slug' | 'status'
>

export type CreatePlanSetup = AdminResult<{
  appId: string
  modules: PlanModuleOption[]
}>
