import { createWorkspaceInvoicesPage } from '../../_components/finance-workspace-pages'

const { Page, generateMetadata } = createWorkspaceInvoicesPage(
  'billing',
  'Billing'
)

export { generateMetadata }
export default Page
