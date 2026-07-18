export interface PlanModuleOption {
  id: string
  key: string
  name: string
  description: string | null
  featureSlug: string | null
  status: 'active' | 'archived'
}
