import { createWorkspacePaymentsPage } from '../../_components/finance-workspace-pages'

const { Page, generateMetadata } = createWorkspacePaymentsPage(
  'billing',
  'Billing'
)

export { generateMetadata }
export default Page
