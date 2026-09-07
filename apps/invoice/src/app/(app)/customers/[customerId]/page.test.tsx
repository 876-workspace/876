import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')
const contactsSource = readFileSync(
  new URL('./_components/customer-contacts.tsx', import.meta.url),
  'utf8'
)
describe('Invoice customer contacts overview', () => {
  it('renders panel chrome in Suspense before contacts resolve', () =>
    expect(source).toContain('fallback={<CustomerContactsPanelSkeleton />}'))
  it('removes the add affordance for a member without customers write access', () => {
    expect(source).toContain("canManage={context.role !== 'staff'}")
    expect(contactsSource).toContain('canManage={canManage}')
  })
})
