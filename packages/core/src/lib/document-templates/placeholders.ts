/**
 * Placeholder tokens a template's free-text content may reference, written
 * `%token%`. Values are substituted as plain text; the output is rendered as a
 * React text node, never as HTML.
 */
export const DOCUMENT_TEMPLATE_PLACEHOLDERS = [
  { token: 'organization.name', label: 'Organization name' },
  { token: 'organization.email', label: 'Organization email' },
  { token: 'organization.phone', label: 'Organization phone' },
  { token: 'organization.website', label: 'Organization website' },
  { token: 'organization.taxId', label: 'Organization tax id' },
  { token: 'customer.name', label: 'Customer name' },
  { token: 'customer.email', label: 'Customer email' },
  { token: 'address.line1', label: 'Address line 1' },
  { token: 'address.line2', label: 'Address line 2' },
  { token: 'address.city', label: 'City' },
  { token: 'address.state', label: 'State / parish' },
  { token: 'address.postalCode', label: 'Postal code' },
  { token: 'address.country', label: 'Country' },
  { token: 'document.number', label: 'Document number' },
  { token: 'document.date', label: 'Document date' },
  { token: 'page.number', label: 'Page number' },
  { token: 'page.count', label: 'Page count' },
] as const

export type DocumentTemplatePlaceholder =
  (typeof DOCUMENT_TEMPLATE_PLACEHOLDERS)[number]['token']

export type PlaceholderValues = Partial<
  Record<DocumentTemplatePlaceholder, string | null>
>

const TOKEN = /%([a-zA-Z]+\.[a-zA-Z0-9]+)%/g

/**
 * Substitutes known tokens, leaves unknown tokens untouched so a typo stays
 * visible in the preview, and drops lines that end up empty — an address with
 * no second line must not render a blank row.
 */
export function renderTemplateContent(
  format: string,
  values: PlaceholderValues
): string {
  const known = new Set<string>(
    DOCUMENT_TEMPLATE_PLACEHOLDERS.map((placeholder) => placeholder.token)
  )

  return format
    .split('\n')
    .map((line) => {
      let hadToken = false
      const rendered = line.replace(TOKEN, (match, token: string) => {
        if (!known.has(token)) return match
        hadToken = true
        return values[token as DocumentTemplatePlaceholder] ?? ''
      })
      return { rendered: rendered.replace(/\s+$/, ''), hadToken }
    })
    .filter(({ rendered, hadToken }) => !(hadToken && rendered.trim() === ''))
    .map(({ rendered }) => rendered)
    .join('\n')
}
