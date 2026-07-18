import { $876 } from '@/lib/876'
import { UsernamesManager } from './usernames-manager'
import { Page, PageBreadcrumb } from '@876/ui/page'

export const metadata = { title: 'Reserved Usernames - Security' }

export default async function SecurityUsernamesPage() {
  const result = await $876.reservedUsernames.list()
  const reserved = result.error ? [] : result.data.data

  return (
    <Page>
      <PageBreadcrumb
        href="/settings/security"
        label="Security"
        className="mb-4"
      />
      <UsernamesManager initialItems={reserved} />
    </Page>
  )
}
