import type { PrimaryContact } from '../_data'

export const SOURCE_LABEL: Record<PrimaryContact['source'], string> = {
  'org-owner': 'Organization owner',
  'org-member': 'Organization member',
  user: '876 user',
  self: 'Customer',
}

export function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  )
}

export function formatCustomerType(type: string): string {
  switch (type) {
    case 'CORE_ORGANIZATION':
      return '876 organization'
    case 'CORE_USER':
      return '876 user'
    default:
      return 'External customer'
  }
}
