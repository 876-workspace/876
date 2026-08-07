/** Row → API resource for the education directory. */

import { fromDbUnixSeconds } from '@/platform/timestamps'

import {
  DIRECTORY_ADDRESS_SELECT,
  serializeDirectoryAddress,
  type DirectoryAddressRow,
} from './directory.serializers'
import type {
  SecondarySchool,
  University,
  UniversityCampus,
} from './education.schemas'

export type UniversityRow = {
  id: string
  name: string
  acronym: string | null
  logoUrl: string | null
  website: string | null
  createdAt: bigint
  updatedAt: bigint
}

export const UNIVERSITY_SELECT = {
  id: true,
  name: true,
  acronym: true,
  logoUrl: true,
  website: true,
  createdAt: true,
  updatedAt: true,
} as const

export function serializeUniversity(row: UniversityRow): University {
  return {
    object: 'university',
    id: row.id,
    name: row.name,
    acronym: row.acronym,
    logo_url: row.logoUrl,
    website: row.website,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export type UniversityCampusRow = {
  id: string
  universityId: string
  name: string
  isMainCampus: boolean
  addressId: string
  contactNumber: string | null
  email: string | null
  createdAt: bigint
  updatedAt: bigint
  directoryAddress: DirectoryAddressRow
}

export const UNIVERSITY_CAMPUS_SELECT = {
  id: true,
  universityId: true,
  name: true,
  isMainCampus: true,
  addressId: true,
  contactNumber: true,
  email: true,
  createdAt: true,
  updatedAt: true,
  directoryAddress: { select: DIRECTORY_ADDRESS_SELECT },
} as const

export function serializeUniversityCampus(
  row: UniversityCampusRow
): UniversityCampus {
  return {
    object: 'university_campus',
    id: row.id,
    university_id: row.universityId,
    name: row.name,
    is_main_campus: row.isMainCampus,
    address_id: row.addressId,
    contact_number: row.contactNumber,
    email: row.email,
    address: serializeDirectoryAddress(row.directoryAddress),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export type SecondarySchoolRow = {
  id: string
  name: string
  principal: string | null
  schoolType: string | null
  logoUrl: string | null
  addressId: string
  contactNumber: string | null
  email: string | null
  createdAt: bigint
  updatedAt: bigint
  directoryAddress: DirectoryAddressRow
}

export const SECONDARY_SCHOOL_SELECT = {
  id: true,
  name: true,
  principal: true,
  schoolType: true,
  logoUrl: true,
  addressId: true,
  contactNumber: true,
  email: true,
  createdAt: true,
  updatedAt: true,
  directoryAddress: { select: DIRECTORY_ADDRESS_SELECT },
} as const

export function serializeSecondarySchool(
  row: SecondarySchoolRow
): SecondarySchool {
  return {
    object: 'secondary_school',
    id: row.id,
    name: row.name,
    principal: row.principal,
    school_type: row.schoolType,
    logo_url: row.logoUrl,
    address_id: row.addressId,
    contact_number: row.contactNumber,
    email: row.email,
    address: serializeDirectoryAddress(row.directoryAddress),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}
