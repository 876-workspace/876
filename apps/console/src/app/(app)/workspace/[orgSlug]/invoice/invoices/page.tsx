import { createWorkspaceInvoicesPage } from '../../_components/finance-workspace-pages'

const { Page, generateMetadata } = createWorkspaceInvoicesPage(
  'invoice',
  'Invoice'
)

export { generateMetadata }
export default Page
