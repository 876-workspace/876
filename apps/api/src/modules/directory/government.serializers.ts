/** Row → API resource for the government directory. */

import { fromDbUnixSeconds } from '@/platform/timestamps'

import {
  DIRECTORY_ADDRESS_SELECT,
  serializeDirectoryAddress,
  type DirectoryAddressRow,
} from './directory.serializers'
import type { Ministry, MinistryDepartment } from './government.schemas'

export type MinistryRow = {
  id: string
  name: string
  portfolio: string | null
  minister: string | null
  website: string | null
  createdAt: bigint
  updatedAt: bigint
}

export const MINISTRY_SELECT = {
  id: true,
  name: true,
  portfolio: true,
  minister: true,
  website: true,
  createdAt: true,
  updatedAt: true,
} as const

export function serializeMinistry(row: MinistryRow): Ministry {
  return {
    object: 'ministry',
    id: row.id,
    name: row.name,
    portfolio: row.portfolio,
    minister: row.minister,
    website: row.website,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export type MinistryDepartmentRow = {
  id: string
  ministryId: string
  name: string
  description: string | null
  addressId: string
  contactEmail: string | null
  contactNumber: string | null
  createdAt: bigint
  updatedAt: bigint
  directoryAddress: DirectoryAddressRow
}

export const MINISTRY_DEPARTMENT_SELECT = {
  id: true,
  ministryId: true,
  name: true,
  description: true,
  addressId: true,
  contactEmail: true,
  contactNumber: true,
  createdAt: true,
  updatedAt: true,
  directoryAddress: { select: DIRECTORY_ADDRESS_SELECT },
} as const

export function serializeMinistryDepartment(
  row: MinistryDepartmentRow
): MinistryDepartment {
  return {
    object: 'ministry_department',
    id: row.id,
    ministry_id: row.ministryId,
    name: row.name,
    description: row.description,
    address_id: row.addressId,
    contact_email: row.contactEmail,
    contact_number: row.contactNumber,
    address: serializeDirectoryAddress(row.directoryAddress),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}
