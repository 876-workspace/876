import {
  composeShippingAddress,
  type ShippingAddressWarehouse,
} from '@/lib/shipping-address'

/** Stand-ins so an admin can read the shape without a real customer. */
const SAMPLE_MAILBOX_NUMBER = '1042'
const SAMPLE_CUSTOMER_NAME = 'Customer Name'

type Props = { warehouse: ShippingAddressWarehouse }

/**
 * Shows the address a customer would give a retailer for this warehouse, so an
 * admin editing the mailbox placement can see what it does to the address.
 */
export function ShippingAddressPreview({ warehouse }: Props) {
  const lines = composeShippingAddress({
    warehouse,
    mailboxNumber: SAMPLE_MAILBOX_NUMBER,
    customerName: SAMPLE_CUSTOMER_NAME,
  })

  const locality = [lines.city, lines.region, lines.postalCode]
    .filter((part) => part !== null && part !== '')
    .join(', ')

  return (
    <div>
      <p className="text-muted-foreground mb-2 text-xs">
        Sample for mailbox {SAMPLE_MAILBOX_NUMBER}.
      </p>
      <address
        aria-label="Sample customer address"
        className="bg-muted/40 rounded-md px-3 py-2 font-mono text-sm leading-6 not-italic"
      >
        <span className="block">{lines.recipient}</span>
        {lines.line1 ? <span className="block">{lines.line1}</span> : null}
        {lines.line2 ? <span className="block">{lines.line2}</span> : null}
        {locality ? <span className="block">{locality}</span> : null}
        <span className="block">{lines.country}</span>
      </address>
    </div>
  )
}
