export interface ProjectsProvisioningManifest {
  object: 'projects-provisioning-manifest'
  revision: number
  labels: Array<{
    key: string
    name: string
    color: string | null
    description: string | null
    sortOrder: number
  }>
  projectTemplates: Array<{
    key: string
    name: string
    projectKey: string
    description: string | null
    sortOrder: number
    isDefault: boolean
  }>
}
