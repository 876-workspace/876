import type { PackageTableRow } from '../_components/packages-table'

export const FAKE_PACKAGES: PackageTableRow[] = [
  ['Nia Campbell', 'Running shoes', 'TRK-24081', 'New Kingston', 'Arrived'],
  ['Andre Williams', 'Office supplies', 'TRK-24080', 'Half Way Tree', 'Ready for pickup'],
  ['Sophia Brown', 'Kitchen appliances', 'TRK-24079', 'Portmore', 'In transit'],
  ['Marcus Thompson', 'Automotive parts', 'TRK-24078', 'Spanish Town', 'Received'],
  ['Aaliyah Grant', 'Personal effects', 'TRK-24077', 'New Kingston', 'Collected'],
  ['Daniel Foster', 'Computer equipment', 'TRK-24076', 'Half Way Tree', 'Unclaimed'],
  ['Maya Robinson', 'Home goods', 'TRK-24075', 'Portmore', 'Pre-alert'],
  ['Jordan Clarke', 'Books and media', 'TRK-24074', 'Spanish Town', 'Arrived'],
].map(([customerName, description, trackingNumber, branch, status], index) => ({
  id: `fake-package-${index + 1}`,
  customerName,
  description,
  trackingNumber,
  branch,
  status,
}))
