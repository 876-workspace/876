import { createWorkspacePaymentsPage } from '../../_components/finance-workspace-pages'

const { Page, generateMetadata } = createWorkspacePaymentsPage(
  'invoice',
  'Invoice'
)

export { generateMetadata }
export default Page
