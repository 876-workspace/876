import type { CSSProperties, ReactNode } from 'react'
import type { Branding } from '@876/core/branding'
import { brandTokens } from '@876/core/branding'
import type {
  DocumentTemplateLayoutKey,
  DocumentTemplateSettings,
  DocumentTemplateType,
  TableColumnKey,
} from '@876/core/document-templates'
import {
  DOCUMENT_TEMPLATE_FONTS,
  renderTemplateContent,
  type PlaceholderValues,
} from '@876/core/document-templates'

import type {
  TemplatedDocumentAddress,
  TemplatedDocumentData,
  TemplatedDocumentLine,
} from './types'

export interface TemplatedDocumentProps {
  documentType: DocumentTemplateType
  layout: DocumentTemplateLayoutKey
  /** Already resolved. */
  settings: DocumentTemplateSettings
  /** Already resolved. */
  branding: Branding
  document: TemplatedDocumentData
  /** Resolved image URLs keyed by Storage file id. Missing → not rendered. */
  imageUrls?: Record<string, string>
  status?: ReactNode
  footerSlot?: ReactNode
}

const FONT_STACKS: Record<(typeof DOCUMENT_TEMPLATE_FONTS)[number], string> = {
  inter: 'Inter, ui-sans-serif, system-ui, sans-serif',
  roboto: 'Roboto, ui-sans-serif, system-ui, sans-serif',
  'open-sans': "'Open Sans', ui-sans-serif, system-ui, sans-serif",
  lato: 'Lato, ui-sans-serif, system-ui, sans-serif',
  'noto-sans': "'Noto Sans', ui-sans-serif, system-ui, sans-serif",
  merriweather: 'Merriweather, Georgia, serif',
  'source-serif': "'Source Serif 4', Georgia, serif",
  'ubuntu-mono': "'Ubuntu Mono', ui-monospace, monospace",
}

const PAPER_WIDTHS: Record<string, { portrait: string; landscape: string }> = {
  a4: { portrait: '210mm', landscape: '297mm' },
  letter: { portrait: '8.5in', landscape: '11in' },
  'receipt-80mm': { portrait: '80mm', landscape: '80mm' },
}

const BACKGROUND_POSITIONS: Record<string, string> = {
  center: 'center',
  'top-left': 'left top',
  'top-right': 'right top',
  'bottom-left': 'left bottom',
  'bottom-right': 'right bottom',
  tile: 'left top',
}

/**
 * Strips a leading currency prefix ("JMD ", "$", "€ ") from a display string.
 * Only applied when the template hides the currency symbol; amount-in-words
 * is never passed through here.
 */
export function stripCurrencyPrefix(value: string): string {
  return value.replace(/^[^0-9]+/, '')
}

function money(value: string, showCurrencySymbol: boolean): string {
  return showCurrencySymbol ? value : stripCurrencyPrefix(value)
}

/** Renders plain text; newlines become block breaks so each line keeps its own accessible name. */
export function TextLines({ text }: { text: string }) {
  if (!text.includes('\n')) return <>{text}</>
  return (
    <>
      {text.split('\n').map((line, index) => (
        <span key={index} className="block">
          {line}
        </span>
      ))}
    </>
  )
}

function addressValues(
  address: TemplatedDocumentAddress | null | undefined
): PlaceholderValues {
  return {
    'address.line1': address?.line1,
    'address.line2': address?.line2,
    'address.city': address?.city,
    'address.state': address?.state,
    'address.postalCode': address?.postalCode,
    'address.country': address?.country,
  }
}

function documentPlaceholders(
  document: TemplatedDocumentData
): PlaceholderValues {
  return {
    'organization.name': document.seller.name,
    'organization.email': document.seller.email,
    'organization.phone': document.seller.phone,
    'organization.website': document.seller.website,
    'organization.taxId': document.seller.taxId,
    'customer.name': document.recipient.name,
    'customer.email': document.recipient.email,
    ...addressValues(document.recipient.billingAddress),
    'document.number': document.details.number,
    'document.date': document.details.date,
    'page.number': '1',
    'page.count': '1',
  }
}

function columnValue(
  column: TableColumnKey,
  line: TemplatedDocumentLine,
  index: number,
  showCurrencySymbol: boolean
): string {
  switch (column) {
    case 'line-number':
      return String(index + 1)
    case 'item':
      return line.name
    case 'quantity':
      return line.quantity
    case 'unit':
      return line.unit ?? '—'
    case 'rate':
      return money(line.rate, showCurrencySymbol)
    case 'discount':
      // Discounts arrive as magnitudes; the renderer prefixes the minus sign.
      return line.discount
        ? `−${money(line.discount, showCurrencySymbol)}`
        : '—'
    case 'tax':
      return line.tax ? money(line.tax, showCurrencySymbol) : '—'
    case 'amount':
      return money(line.amount, showCurrencySymbol)
  }
}

export function TemplatedDocument({
  documentType,
  layout,
  settings,
  branding,
  document,
  imageUrls,
  status,
  footerSlot,
}: TemplatedDocumentProps) {
  const general = settings.general
  const accent = general.accentColor ?? 'var(--brand-accent)'
  const paper = PAPER_WIDTHS[general.paperSize] ?? PAPER_WIDTHS.a4
  const backgroundImageUrl = general.backgroundImageFileId
    ? imageUrls?.[general.backgroundImageFileId]
    : undefined
  const narrow = general.paperSize === 'receipt-80mm'

  const baseStyle: CSSProperties = {
    maxWidth: paper[general.orientation],
    backgroundColor: general.backgroundColor,
    color: general.fontColor,
    fontFamily: FONT_STACKS[general.fontFamily],
    fontSize: general.fontSize,
    padding: `${general.margins.top}in ${general.margins.right}in ${general.margins.bottom}in ${general.margins.left}in`,
    ...(backgroundImageUrl
      ? {
          backgroundImage: `url(${backgroundImageUrl})`,
          backgroundPosition:
            BACKGROUND_POSITIONS[general.backgroundImagePosition] ?? 'center',
          backgroundRepeat:
            general.backgroundImagePosition === 'tile' ? 'repeat' : 'no-repeat',
        }
      : null),
  }
  // Custom properties ride along as extra (non-fresh) props, so no cast is
  // needed to satisfy CSSProperties.
  const rootStyle: CSSProperties = Object.assign(
    baseStyle,
    brandTokens(branding),
    {
      '--document-accent': accent,
    }
  )

  const values = documentPlaceholders(document)
  const visibleColumns = settings.table.columns.filter((column) => column.show)

  return (
    <article
      data-layout={layout}
      data-document-type={documentType}
      style={rootStyle}
      className="mx-auto w-full overflow-hidden bg-white shadow-sm print:max-w-none print:shadow-none"
    >
      {status}
      {layout === 'elegant' ? (
        <ElegantBand settings={settings} document={document} accent={accent} />
      ) : (
        <StandardHead
          layout={layout}
          settings={settings}
          document={document}
          narrow={narrow}
          imageUrls={imageUrls}
        />
      )}
      <HeaderBlock settings={settings} values={values} />
      <section
        className={narrow ? 'mt-6 space-y-6' : 'mt-6 grid gap-8 sm:grid-cols-2'}
      >
        <CustomerBlock settings={settings} document={document} />
        <DetailsBlock settings={settings} document={document} layout={layout} />
      </section>
      <TableBlock
        settings={settings}
        document={document}
        visibleColumns={visibleColumns}
      />
      <TotalsBlock settings={settings} document={document} />
      <ExtraBlocks
        settings={settings}
        document={document}
        imageUrls={imageUrls}
      />
      {general.includePaymentStub && documentType === 'invoice' ? (
        <PaymentStub document={document} />
      ) : null}
      <FooterBlock settings={settings} values={values} />
      {footerSlot}
    </article>
  )
}

function StandardHead({
  layout,
  settings,
  document,
  narrow,
  imageUrls,
}: {
  layout: DocumentTemplateLayoutKey
  settings: DocumentTemplateSettings
  document: TemplatedDocumentData
  narrow: boolean
  imageUrls?: Record<string, string>
}) {
  const org = <OrganizationBlock settings={settings} document={document} />
  const title = (
    <TitleBlock settings={settings} document={document} alignRight={!narrow} />
  )
  if (narrow || layout === 'retail') {
    return (
      <header className="text-center">
        {org}
        <div className="mt-4">{title}</div>
      </header>
    )
  }
  if (layout === 'european') {
    return (
      <header className="flex flex-col justify-between gap-8 sm:flex-row sm:items-start">
        {title}
        <div className="sm:text-right">{org}</div>
      </header>
    )
  }
  return (
    <header className="flex flex-col justify-between gap-8 sm:flex-row sm:items-start">
      {org}
      {title}
    </header>
  )
}

function ElegantBand({
  settings,
  document,
  accent,
}: {
  settings: DocumentTemplateSettings
  document: TemplatedDocumentData
  accent: string
}) {
  const org = settings.organization
  const seller = document.seller
  const addressText = org.showAddress
    ? renderTemplateContent(org.addressFormat, {
        'organization.name': seller.name,
        'organization.email': seller.email,
        'organization.phone': seller.phone,
        'organization.website': seller.website,
        'organization.taxId': seller.taxId,
        ...addressValues(seller.address),
      })
    : ''
  return (
    <header style={{ backgroundColor: accent }} className="text-white">
      <div className="flex flex-col justify-between gap-6 p-6 sm:flex-row sm:items-center">
        <div>
          {org.showLogo && document.seller.logoUrl ? (
            <img
              src={document.seller.logoUrl}
              alt=""
              style={{ height: org.logoHeight }}
              className="mb-3 w-auto max-w-48 object-contain object-left"
            />
          ) : null}
          {org.showName ? (
            <p
              style={{
                fontSize: org.name.fontSize,
                color: '#ffffff',
              }}
              className="font-semibold"
            >
              {document.seller.name}
            </p>
          ) : null}
          {addressText ? (
            <div className="mt-1 text-sm leading-6 text-white">
              {addressText.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          ) : null}
          <SellerContactLines seller={seller} light />
        </div>
        <TitleBlock settings={settings} document={document} alignRight light />
      </div>
    </header>
  )
}

function OrganizationBlock({
  settings,
  document,
}: {
  settings: DocumentTemplateSettings
  document: TemplatedDocumentData
}) {
  const org = settings.organization
  const seller = document.seller
  const addressText = org.showAddress
    ? renderTemplateContent(org.addressFormat, {
        'organization.name': seller.name,
        'organization.email': seller.email,
        'organization.phone': seller.phone,
        'organization.website': seller.website,
        'organization.taxId': seller.taxId,
        ...addressValues(seller.address),
      })
    : ''
  return (
    <div>
      {org.showLogo && seller.logoUrl ? (
        <img
          src={seller.logoUrl}
          alt=""
          style={{ height: org.logoHeight }}
          className="mb-4 w-auto max-w-48 object-contain object-left"
        />
      ) : null}
      {org.showName ? (
        <p
          style={{ fontSize: org.name.fontSize, color: org.name.fontColor }}
          className="font-semibold"
        >
          {seller.name}
        </p>
      ) : null}
      {addressText ? (
        <div className="mt-1 text-sm leading-6">
          {addressText.split('\n').map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      ) : null}
      <SellerContactLines seller={seller} />
    </div>
  )
}

function SellerContactLines({
  seller,
  light,
}: {
  seller: TemplatedDocumentData['seller']
  light?: boolean
}) {
  const contacts = [
    seller.email,
    seller.phone,
    seller.website,
    seller.taxId,
  ].filter((value): value is string => Boolean(value))
  if (contacts.length === 0) return null
  return (
    <div
      style={light ? { color: '#ffffff' } : undefined}
      className="mt-1 text-sm leading-6"
    >
      {contacts.map((contact) => (
        <p key={contact}>{contact}</p>
      ))}
    </div>
  )
}

function TitleBlock({
  settings,
  document,
  alignRight,
  light,
}: {
  settings: DocumentTemplateSettings
  document: TemplatedDocumentData
  alignRight?: boolean
  light?: boolean
}) {
  const details = settings.documentDetails
  const balance = document.totals.balanceDue
  return (
    <div className={alignRight ? 'sm:text-right' : undefined}>
      {details.showTitle ? (
        <p
          style={{
            fontSize: details.titleStyle.fontSize,
            color: light ? '#ffffff' : details.titleStyle.fontColor,
          }}
          className="font-semibold tracking-tight"
        >
          {details.title}
        </p>
      ) : null}
      {balance ? (
        <div className="mt-4">
          <p
            style={{ color: settings.general.labelColor }}
            className="text-xs font-semibold tracking-wide uppercase"
          >
            {settings.totals.balanceDueLabel}
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
            {money(balance, settings.totals.showCurrencySymbol)}
          </p>
        </div>
      ) : null}
    </div>
  )
}

function HeaderBlock({
  settings,
  values,
}: {
  settings: DocumentTemplateSettings
  values: PlaceholderValues
}) {
  const header = settings.header
  const text = renderTemplateContent(header.content, values)
  if (!header.show || !text.trim()) return null
  return (
    <div
      style={{
        fontSize: header.fontSize,
        color: header.fontColor,
        backgroundColor: header.backgroundColor ?? undefined,
      }}
      className="mt-4"
    >
      {text.split('\n').map((line, index) => (
        <p key={index}>{line}</p>
      ))}
    </div>
  )
}

function CustomerBlock({
  settings,
  document,
}: {
  settings: DocumentTemplateSettings
  document: TemplatedDocumentData
}) {
  const customer = settings.customer
  const recipient = document.recipient
  return (
    <div className="space-y-6">
      {customer.showBillTo ? (
        <section>
          <h2
            style={{ color: settings.general.labelColor }}
            className="text-xs font-semibold tracking-wide uppercase"
          >
            {customer.billToLabel}
          </h2>
          <div className="mt-3 text-sm leading-6">
            <p
              style={{
                fontSize: customer.name.fontSize,
                color: customer.name.fontColor,
              }}
              className="font-semibold"
            >
              {recipient.name}
            </p>
            {renderTemplateContent(customer.billingAddressFormat, {
              'customer.name': recipient.name,
              'customer.email': recipient.email,
              ...addressValues(recipient.billingAddress),
            })
              .split('\n')
              .map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            {recipient.email ? <p>{recipient.email}</p> : null}
            {recipient.phone ? <p>{recipient.phone}</p> : null}
          </div>
        </section>
      ) : null}
      {customer.showShipTo ? (
        <section>
          <h2
            style={{ color: settings.general.labelColor }}
            className="text-xs font-semibold tracking-wide uppercase"
          >
            {customer.shipToLabel}
          </h2>
          <div className="mt-3 text-sm leading-6">
            {renderTemplateContent(customer.shippingAddressFormat, {
              'customer.name': recipient.name,
              'customer.email': recipient.email,
              ...addressValues(recipient.shippingAddress),
            })
              .split('\n')
              .map((line, index) => (
                <p key={index}>{line}</p>
              ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function DetailsBlock({
  settings,
  document,
  layout,
}: {
  settings: DocumentTemplateSettings
  document: TemplatedDocumentData
  layout: DocumentTemplateLayoutKey
}) {
  const details = settings.documentDetails
  const rows = details.fields.filter(
    (field) => field.show && document.details[field.key]
  )
  if (rows.length === 0) return null
  return (
    <dl
      data-spreadsheet={layout === 'spreadsheet' ? 'true' : undefined}
      className={
        layout === 'spreadsheet'
          ? 'content-start divide-y divide-neutral-200 rounded-md border border-neutral-200 text-sm'
          : 'grid grid-cols-[1fr_auto] content-start gap-x-8 gap-y-3 text-sm'
      }
    >
      {rows.map((field) =>
        layout === 'spreadsheet' ? (
          <div
            key={field.key}
            className="flex items-baseline justify-between gap-4 px-3 py-2"
          >
            <dt style={{ color: settings.general.labelColor }}>
              {field.label}
            </dt>
            <dd className="text-right font-medium tabular-nums">
              <TextLines text={document.details[field.key] ?? ''} />
            </dd>
          </div>
        ) : (
          <DetailsRow
            key={field.key}
            label={field.label}
            labelColor={settings.general.labelColor}
            value={document.details[field.key] ?? ''}
          />
        )
      )}
    </dl>
  )
}

function DetailsRow({
  label,
  labelColor,
  value,
}: {
  label: string
  labelColor: string
  value: string
}) {
  return (
    <>
      <dt style={{ color: labelColor }}>{label}</dt>
      <dd className="text-right font-medium tabular-nums">
        <TextLines text={value} />
      </dd>
    </>
  )
}

function TableBlock({
  settings,
  document,
  visibleColumns,
}: {
  settings: DocumentTemplateSettings
  document: TemplatedDocumentData
  visibleColumns: DocumentTemplateSettings['table']['columns']
}) {
  const table = settings.table
  if (visibleColumns.length === 0) return null
  return (
    <div className="mt-8 overflow-x-auto">
      <table
        className={
          table.showBorders
            ? 'w-full border-collapse border border-neutral-200 text-sm'
            : 'w-full text-sm'
        }
      >
        <thead>
          <tr
            style={{
              fontSize: table.header.fontSize,
              color: table.header.fontColor,
              backgroundColor: table.header.backgroundColor ?? undefined,
            }}
          >
            {visibleColumns.map((column) => (
              <th
                key={column.key}
                scope="col"
                style={
                  column.widthPercent
                    ? { width: `${column.widthPercent}%` }
                    : undefined
                }
                className={
                  table.showBorders
                    ? 'border border-neutral-200 px-3 py-2 text-left font-semibold'
                    : 'px-3 py-2 text-left font-semibold'
                }
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          style={{
            fontSize: table.row.fontSize,
            color: table.row.fontColor,
            backgroundColor: table.row.backgroundColor ?? undefined,
          }}
        >
          {document.lines.map((line, index) => (
            <tr
              key={line.id}
              className={
                table.showBorders ? 'border border-neutral-200' : undefined
              }
            >
              {visibleColumns.map((column) => (
                <td
                  key={column.key}
                  className={
                    table.showBorders
                      ? 'border border-neutral-200 px-3 py-2 align-top tabular-nums'
                      : 'px-3 py-2 align-top tabular-nums'
                  }
                >
                  {column.key === 'item' ? (
                    <>
                      {line.name}
                      {table.showItemDescription && line.description ? (
                        <span
                          style={{
                            fontSize: table.description.fontSize,
                            color: table.description.fontColor,
                          }}
                          className="block"
                        >
                          <TextLines text={line.description} />
                        </span>
                      ) : null}
                    </>
                  ) : (
                    columnValue(
                      column.key,
                      line,
                      index,
                      settings.totals.showCurrencySymbol
                    )
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TotalsBlock({
  settings,
  document,
}: {
  settings: DocumentTemplateSettings
  document: TemplatedDocumentData
}) {
  const totals = settings.totals
  if (!totals.show) return null
  const showCurrency = totals.showCurrencySymbol
  const data = document.totals
  const quantityTotal = totals.showQuantityTotal
    ? sumQuantities(document.lines)
    : null
  return (
    <div className="mt-8 flex justify-end">
      <div className="w-full max-w-xs space-y-2 text-sm">
        {data.subtotal ? (
          <TotalsRow
            label={totals.subtotalLabel}
            value={money(data.subtotal, showCurrency)}
          />
        ) : null}
        {data.discount ? (
          <TotalsRow
            label="Discount"
            value={`−${money(data.discount, showCurrency)}`}
          />
        ) : null}
        {data.shipping ? (
          <TotalsRow
            label="Shipping"
            value={money(data.shipping, showCurrency)}
          />
        ) : null}
        {data.adjustment ? (
          <TotalsRow
            label="Adjustment"
            value={money(data.adjustment, showCurrency)}
          />
        ) : null}
        {data.tax ? (
          <TotalsRow label="Tax" value={money(data.tax, showCurrency)} />
        ) : null}
        {quantityTotal !== null ? (
          <TotalsRow label="Quantity" value={quantityTotal} />
        ) : null}
        {data.total ? (
          <div
            style={{
              fontSize: totals.totalStyle.fontSize,
              color: totals.totalStyle.fontColor,
              backgroundColor: totals.totalStyle.backgroundColor ?? undefined,
            }}
            className="flex items-baseline justify-between gap-4 font-semibold"
          >
            <span>{totals.totalLabel}</span>
            <span className="tabular-nums">
              {money(data.total, showCurrency)}
            </span>
          </div>
        ) : null}
        {totals.showPaymentDetails && data.amountCredited ? (
          <TotalsRow
            label="Credits applied"
            value={`−${money(data.amountCredited, showCurrency)}`}
          />
        ) : null}
        {totals.showPaymentDetails && data.amountPaid ? (
          <TotalsRow
            label="Payments received"
            value={`−${money(data.amountPaid, showCurrency)}`}
          />
        ) : null}
        {data.balanceDue ? (
          <div
            style={{
              fontSize: totals.balanceDueStyle.fontSize,
              color: totals.balanceDueStyle.fontColor,
              backgroundColor:
                totals.balanceDueStyle.backgroundColor ?? undefined,
            }}
            className="flex items-baseline justify-between gap-4 font-semibold"
          >
            <span>{totals.balanceDueLabel}</span>
            <span className="tabular-nums">
              {money(data.balanceDue, showCurrency)}
            </span>
          </div>
        ) : null}
        {totals.showAmountInWords && data.amountInWords ? (
          <p className="pt-1 text-sm">{data.amountInWords}</p>
        ) : null}
        {totals.showTaxSummary && document.taxSummary.length > 0 ? (
          <div className="pt-2">
            {document.taxSummary.map((row, index) => (
              <TotalsRow
                key={index}
                label={row.rate ? `${row.label} (${row.rate})` : row.label}
                value={money(row.amount, showCurrency)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function TotalsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

function sumQuantities(lines: TemplatedDocumentLine[]): string {
  const total = lines.reduce((sum, line) => {
    const parsed = Number.parseFloat(line.quantity)
    return Number.isFinite(parsed) ? sum + parsed : sum
  }, 0)
  return Number.isInteger(total)
    ? String(total)
    : String(Math.round(total * 100) / 100)
}

function ExtraBlocks({
  settings,
  document,
  imageUrls,
}: {
  settings: DocumentTemplateSettings
  document: TemplatedDocumentData
  imageUrls?: Record<string, string>
}) {
  const other = settings.otherDetails
  const signatureUrl = other.signature.imageFileId
    ? imageUrls?.[other.signature.imageFileId]
    : undefined
  return (
    <div className="mt-8 space-y-6">
      {other.notes.show && document.notes ? (
        <section>
          <h2
            className="font-semibold"
            style={{ fontSize: other.notes.fontSize }}
          >
            {other.notes.label}
          </h2>
          <div
            className="mt-2 text-pretty whitespace-pre-wrap"
            style={{ fontSize: other.notes.fontSize }}
          >
            <TextLines text={document.notes} />
          </div>
        </section>
      ) : null}
      {other.terms.show && document.terms ? (
        <section>
          <h2
            className="font-semibold"
            style={{ fontSize: other.terms.fontSize }}
          >
            {other.terms.label}
          </h2>
          <div
            className="mt-2 text-pretty whitespace-pre-wrap"
            style={{ fontSize: other.terms.fontSize }}
          >
            <TextLines text={document.terms} />
          </div>
        </section>
      ) : null}
      {other.showPaymentOptions && document.paymentOptions.length > 0 ? (
        <section>
          <h2 className="font-semibold">Payment options</h2>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {document.paymentOptions.map((option, index) => (
              <li key={index}>{option}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {other.showBankDetails && document.bankDetails.length > 0 ? (
        <section>
          <h2 className="font-semibold">Bank details</h2>
          <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-8 gap-y-1 text-sm">
            {document.bankDetails.map((row, index) => (
              <DetailsRow
                key={index}
                label={row.label}
                labelColor={settings.general.labelColor}
                value={row.value}
              />
            ))}
          </dl>
        </section>
      ) : null}
      {other.showQrCode && document.qrCodeUrl ? (
        <img
          src={document.qrCodeUrl}
          alt="Payment QR code"
          className="h-24 w-24"
        />
      ) : null}
      {other.signature.show ? (
        <section>
          <p className="text-sm font-semibold">{other.signature.label}</p>
          {signatureUrl ? (
            <img
              src={signatureUrl}
              alt={other.signature.label}
              className="mt-2 h-16 w-auto"
            />
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

function PaymentStub({ document }: { document: TemplatedDocumentData }) {
  return (
    <section className="mt-8 border-t-2 border-dashed border-neutral-300 pt-4 text-sm">
      <p className="font-semibold">{document.seller.name}</p>
      {document.details.number ? (
        <p>Document {document.details.number}</p>
      ) : null}
      {document.totals.balanceDue ? (
        <p className="tabular-nums">Balance due {document.totals.balanceDue}</p>
      ) : null}
      <p className="mt-4">
        Amount enclosed:{' '}
        <span className="inline-block min-w-40 border-b border-neutral-400" />
      </p>
    </section>
  )
}

function FooterBlock({
  settings,
  values,
}: {
  settings: DocumentTemplateSettings
  values: PlaceholderValues
}) {
  const footer = settings.footer
  if (!footer.show) return null
  const text = renderTemplateContent(footer.content, values)
  if (!text.trim() && !footer.showPageNumber) return null
  return (
    <div
      style={{
        fontSize: footer.fontSize,
        color: footer.fontColor,
        backgroundColor: footer.backgroundColor ?? undefined,
      }}
      className="mt-8"
    >
      {text
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      {footer.showPageNumber ? <p>Page 1 of 1</p> : null}
    </div>
  )
}
