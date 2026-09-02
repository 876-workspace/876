import { createWorkspaceItemsPage } from '../../_components/finance-workspace-pages'

const { Page, generateMetadata } = createWorkspaceItemsPage(
  'invoice',
  'Invoice',
  'No billable items exist in this workspace yet.'
)

export { generateMetadata }
export default Page
