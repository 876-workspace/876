import { createWorkspaceItemsPage } from '../../_components/finance-workspace-pages'

const { Page, generateMetadata } = createWorkspaceItemsPage(
  'billing',
  'Billing',
  'No catalog items exist in this workspace yet.'
)

export { generateMetadata }
export default Page
