import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * A design token that references an undefined custom property is not a build
 * error and not a type error — the whole declaration is simply dropped, so the
 * value silently becomes nothing. `--876-shell-gutter: var(--spacing-4)`
 * shipped that way: Tailwind v4 defines only `--spacing` and computes each
 * step, so every shell gutter collapsed to zero. Class-name assertions cannot
 * catch it, because the class string is identical either way.
 */

const here = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

const LOCAL_CSS = ['876.css', '876-themes.css', 'styles.css'] as const

/**
 * Custom properties supplied at runtime by something outside this package:
 * Base UI sets the collapsible height on the element it animates, and the host
 * app's `next/font` loader defines the font variables on `<html>`.
 */
const RUNTIME_SUPPLIED = new Set([
  '--collapsible-panel-height',
  '--font-geist-mono',
  '--font-geist-sans',
])

function readLocalCss(): string {
  return LOCAL_CSS.map((file) => readFileSync(join(here, file), 'utf8')).join(
    '\n'
  )
}

function readTailwindTheme(): string {
  return readFileSync(require.resolve('tailwindcss/theme.css'), 'utf8')
}

/** Every custom property this stylesheet set defines, e.g. `--876-canvas`. */
function definedProperties(css: string): Set<string> {
  return new Set(
    Array.from(css.matchAll(/(--[\w-]+)\s*:/g), (match) => match[1])
  )
}

/** Every custom property referenced through `var(--x)`. */
function referencedProperties(css: string): string[] {
  return Array.from(css.matchAll(/var\(\s*(--[\w-]+)/g), (match) => match[1])
}

describe('876 design tokens', () => {
  it('defines --876-shell-gutter at three breakpoints as a resolvable length', () => {
    const css = readFileSync(join(here, '876.css'), 'utf8')

    const declarations = Array.from(
      css.matchAll(/--876-shell-gutter:\s*([^;]+);/g),
      (match) => match[1].trim()
    )

    expect(declarations).toEqual([
      'calc(var(--spacing) * 4)',
      'calc(var(--spacing) * 6)',
      'calc(var(--spacing) * 8)',
    ])
  })

  it('resolves --876-shell-gutter against a --spacing scale Tailwind actually defines', () => {
    const theme = readTailwindTheme()

    expect(definedProperties(theme).has('--spacing')).toBe(true)
    expect(definedProperties(theme).has('--spacing-4')).toBe(false)
  })

  it('references no custom property that neither this package nor Tailwind defines', () => {
    const css = readLocalCss()
    const defined = definedProperties(css)
    const themeDefined = definedProperties(readTailwindTheme())

    const undefinedRefs = Array.from(
      new Set(
        referencedProperties(css).filter(
          (property) =>
            !defined.has(property) &&
            !themeDefined.has(property) &&
            !RUNTIME_SUPPLIED.has(property)
        )
      )
    ).sort()

    expect(undefinedRefs).toEqual([])
  })
})
