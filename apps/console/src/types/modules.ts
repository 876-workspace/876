import type {
  AdminApplicationModule,
  AdminFeature,
  AdminResult,
} from '@876/platform/compat'

export type ModuleFeatureOption = Pick<AdminFeature, 'id' | 'name' | 'slug'>
export type ModulesResult = AdminResult<AdminApplicationModule[]>
export type ModuleFeaturesResult = AdminResult<ModuleFeatureOption[]>

export interface RegistryModuleDefinition {
  key: string
  name: string
  description: string
}

export interface ModulesContext {
  appId: string
  canManage: boolean
  registryManaged: boolean
  registryModuleKeys: string[]
  registryModules: RegistryModuleDefinition[]
}
