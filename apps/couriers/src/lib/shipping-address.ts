import type { MailboxPlacement } from '@/types/warehouse'

/**
 * Only the parts of a warehouse that decide the address a customer types.
 *
 * Structural rather than `WarehouseView` so the settings form can preview the
 * address it is editing before it is saved — a preview built from the stored
 * record would go stale the moment the admin changes the placement.
 */
export type ShippingAddressWarehouse = {
  code: string | null
  mailboxPrefix: string | null
  mailboxPlacement: MailboxPlacement
  address: {
    line1: string
    line2?: string | null
    city: string
    regionCode?: string | null
    regionName?: string | null
    countryCode: string
    postalCode?: string | null
  }
}

export type ShippingAddressInput = {
  warehouse: ShippingAddressWarehouse
  /** The customer's mailbox number, e.g. "1042". */
  mailboxNumber: string
  /** The customer's full name as it should appear on the parcel. */
  customerName: string
}

/** The address lines a customer types into a retailer's checkout, in order. */
export type ShippingAddressLines = {
  recipient: string
  line1: string
  line2: string | null
  city: string
  region: string | null
  postalCode: string | null
  country: string
}

/** Absence and blank are the same thing on a rendered address line. */
function present(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null

  const trimmed = value.trim()

  return trimmed === '' ? null : trimmed
}

/** Joins the parts that exist, so a missing part never leaves a stray comma. */
function joinParts(parts: (string | null)[]): string {
  return parts.filter((part): part is string => part !== null).join(', ')
}

/**
 * Builds the address a customer gives a retailer so the parcel reaches the
 * right mailbox.
 *
 * The mailbox token is the warehouse `code` and `mailboxPrefix` followed by the
 * customer's mailbox number, single-spaced. The prefix is a courier's label for
 * the mailbox ("Suite", "JMC") rather than part of the number itself, so the
 * separator belongs here and an operation never has to store a trailing space
 * to get one. Where the token lands is the warehouse's `mailboxPlacement`.
 *
 * @param input - The warehouse, the customer's mailbox number, and their name.
 * @returns The composed address lines, in the order a customer types them.
 *
 * @example
 * const lines = composeShippingAddress({
 *   warehouse,
 *   mailboxNumber: '1042',
 *   customerName: 'Alejandra Reyes',
 * })
 * console.log(lines.recipient) // 'Alejandra Reyes JMC 1042'
 */
export function composeShippingAddress(
  input: ShippingAddressInput
): ShippingAddressLines {
  const { warehouse, mailboxNumber, customerName } = input
  const { address } = warehouse

  const token = present(
    [
      present(warehouse.code),
      present(warehouse.mailboxPrefix),
      present(mailboxNumber),
    ]
      .filter((part) => part !== null)
      .join(' ')
  )

  const name = present(customerName)
  const line1 = present(address.line1)
  const line2 = present(address.line2)

  const placement = warehouse.mailboxPlacement

  const recipient =
    placement === 'RECIPIENT_LINE'
      ? [name, token].filter((part) => part !== null).join(' ')
      : (name ?? '')

  const composedLine1 =
    placement === 'ADDRESS_LINE_1' ? joinParts([line1, token]) : (line1 ?? '')

  const composedLine2 =
    placement === 'ADDRESS_LINE_2' ? joinParts([line2, token]) : line2

  return {
    recipient,
    line1: composedLine1,
    line2: present(composedLine2),
    city: address.city,
    region: present(address.regionName) ?? present(address.regionCode),
    postalCode: present(address.postalCode),
    country: address.countryCode,
  }
}
