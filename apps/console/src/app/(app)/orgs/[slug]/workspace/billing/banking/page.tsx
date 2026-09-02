import { createWorkspaceBankingPage } from '../../_components/finance-workspace-pages'

const { Page, generateMetadata } = createWorkspaceBankingPage(
  'billing',
  'Billing'
)

export { generateMetadata }
export default Page
