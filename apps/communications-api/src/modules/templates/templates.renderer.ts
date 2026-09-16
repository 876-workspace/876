export type TemplateVariables = Record<string, string | number | boolean>

const PLACEHOLDER = /{{\s*([a-zA-Z0-9._-]+)\s*}}/g

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function render(
  source: string,
  variables: TemplateVariables,
  mode: 'html' | 'text' | 'header'
): string | null {
  let missing = false
  const rendered = source.replace(PLACEHOLDER, (_match, key: string) => {
    const value = variables[key]
    if (value === undefined) {
      missing = true
      return ''
    }

    const text = String(value)
    return mode === 'html' ? escapeHtml(text) : text
  })

  if (missing) return null
  if (mode === 'header' && /[\r\n]/.test(rendered)) return null
  return rendered
}

export function renderEmailTemplate(input: {
  subject: string
  html: string
  text: string | null
  variables: TemplateVariables
}) {
  const subject = render(input.subject, input.variables, 'header')
  const html = render(input.html, input.variables, 'html')
  const text = input.text
    ? render(input.text, input.variables, 'text')
    : null

  if (subject === null || html === null || (input.text && text === null))
    return null

  return { subject, html, text }
}
