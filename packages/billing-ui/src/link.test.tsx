import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { BillingUiLinkProvider, Link } from './link'

function sourceFiles(directory = 'src', relativeDirectory = ''): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = join(relativeDirectory, entry.name)
    const path = join(directory, entry.name)

    if (entry.isDirectory()) return sourceFiles(path, relativePath)
    if (relativePath === 'panels/panel.test.ts') return []
    return entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')
      ? [path]
      : []
  })
}

/**
 * Parses each import statement individually. A single lazy regex can span
 * semicolon-less imports and report a fixture string as an actual import.
 */
function importsNextLink(source: string): boolean {
  const statements = source.matchAll(
    /import\s+([\s\S]*?)\s*from\s+['"]([^'"]+)['"]/g
  )

  for (const [, , specifier] of statements) {
    if (specifier === 'next/link') return true
  }

  return false
}

function HostLink({
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { children?: ReactNode }) {
  return (
    <a data-host-link="true" {...props}>
      {children}
    </a>
  )
}

describe('Billing UI Link', () => {
  it('renders the host-supplied link component', () => {
    render(
      <BillingUiLinkProvider component={HostLink}>
        <Link href="/invoices/123">Invoice 123</Link>
      </BillingUiLinkProvider>
    )

    const link = screen.getByRole('link', { name: 'Invoice 123' })
    expect(link).toHaveAttribute('href', '/invoices/123')
    expect(link).toHaveAttribute('data-host-link', 'true')
  })

  it('falls back to an anchor when no host link component is provided', () => {
    render(<Link href="/invoices/123">Invoice 123</Link>)

    const link = screen.getByRole('link', { name: 'Invoice 123' })
    expect(link).toHaveAttribute('href', '/invoices/123')
    expect(link).not.toHaveAttribute('data-host-link')
  })

  it('does not import next/link from billing UI source files', () => {
    for (const path of sourceFiles())
      expect(
        importsNextLink(readFileSync(path, 'utf8')),
        `${path} imports next/link`
      ).toBe(false)
  })
})
