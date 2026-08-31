import { NewSetupCard } from './_components/new-setup-card'

export const metadata = { title: 'New Provisioning Setup' }

/**
 * Renders in the right-side detail slot beside the setups list when `/new` is active.
 */
export default function NewProvisioningSetupPage() {
  return <NewSetupCard />
}
