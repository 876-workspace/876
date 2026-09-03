import { createWorkspaceCustomersPage } from '../../_components/finance-workspace-pages'

const { Page, generateMetadata } = createWorkspaceCustomersPage(
  'billing',
  'Billing'
)

export { generateMetadata }
export default Page
