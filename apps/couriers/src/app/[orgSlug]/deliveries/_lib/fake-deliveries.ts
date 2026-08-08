import type { DeliveryTableRow } from '../_components/deliveries-table'

export const FAKE_DELIVERIES: DeliveryTableRow[] = [
  ['Nia Campbell', 'DLV-1081', 'New Kingston', 'Aug 9, 2026 · 9:00 AM', '2', 'Scheduled'],
  ['Andre Williams', 'DLV-1080', 'Half Way Tree', 'Aug 8, 2026 · 10:30 AM', '1', 'Out for delivery'],
  ['Sophia Brown', 'DLV-1079', 'Portmore', 'Aug 8, 2026 · 1:00 PM', '3', 'Delivered'],
  ['Marcus Thompson', 'DLV-1078', 'Spanish Town', 'Aug 10, 2026 · 9:30 AM', '1', 'Scheduled'],
  ['Aaliyah Grant', 'DLV-1077', 'Constant Spring', 'Aug 7, 2026 · 2:00 PM', '2', 'Delivered'],
  ['Daniel Foster', 'DLV-1076', 'Liguanea', 'Aug 6, 2026 · 11:00 AM', '1', 'Failed'],
  ['Maya Robinson', 'DLV-1075', 'Mona', 'Aug 5, 2026 · 3:30 PM', '4', 'Returned'],
  ['Jordan Clarke', 'DLV-1074', 'Red Hills', 'Aug 11, 2026 · 8:30 AM', '1', 'Scheduled'],
].map(([customerName, code, area, dateTime, packages, status], index) => ({
  id: `fake-delivery-${index + 1}`,
  customerName,
  code,
  area,
  dateTime,
  packages,
  status,
}))
