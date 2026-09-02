import { createWorkspaceCustomersPage } from '../../_components/finance-workspace-pages'

const { Page, generateMetadata } = createWorkspaceCustomersPage(
  'invoice',
  'Invoice'
)

export { generateMetadata }
export default Page
