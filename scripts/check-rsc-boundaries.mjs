#!/usr/bin/env node
// Finds function props passed from a Server Component to a Client Component.
//
// React cannot serialize a function across the RSC boundary. In development
// Next prints the real message; in a production build the page crashes with
// the opaque "Minified React error #441" and the cause only appears in the
// server logs. Nothing in typecheck, lint, or the unit suites catches it,
// because each side is valid on its own — the defect is the edge between them.
//
// The check walks the import graph from every route file (`page`, `layout`,
// `template`, `not-found`, `default`), following only modules without a
// `'use client'` directive, since those are the ones that render on the server.
// In each, it flags a JSX attribute whose value is a function — an inline arrow
// or function expression, or an identifier bound to one in the same file —
// when the element's component is imported from a `'use client'` module.
//
// Usage: node scripts/check-rsc-boundaries.mjs [app ...]   (default: every app)

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROUTE_FILE = /^(page|layout|template|not-found|default)\.(tsx|ts|jsx|js)$/
const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js']

const sourceCache = new Map()
function parse(file) {
  if (!sourceCache.has(file)) {
    const text = readFileSync(file, 'utf-8')
    sourceCache.set(
      file,
      ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
    )
  }
  return sourceCache.get(file)
}

function isClientModule(file) {
  const source = parse(file)
  for (const statement of source.statements) {
    if (
      ts.isExpressionStatement(statement) &&
      ts.isStringLiteral(statement.expression)
    ) {
      if (statement.expression.text === 'use client') return true
      continue
    }
    return false
  }
  return false
}

function withExtension(base) {
  if (existsSync(base) && statSync(base).isFile()) return base
  for (const ext of EXTENSIONS) if (existsSync(base + ext)) return base + ext
  for (const ext of EXTENSIONS)
    if (existsSync(join(base, `index${ext}`))) return join(base, `index${ext}`)
  return null
}

const packageExports = new Map()
function resolvePackage(specifier) {
  const match = specifier.match(/^@876\/([^/]+)(?:\/(.+))?$/)
  if (!match) return null
  const [, name, subpath] = match
  const dir = join(root, 'packages', name)
  const manifest = join(dir, 'package.json')
  if (!existsSync(manifest)) return null
  if (!packageExports.has(dir))
    packageExports.set(dir, JSON.parse(readFileSync(manifest, 'utf-8')).exports)
  const exportsMap = packageExports.get(dir)
  if (!exportsMap || typeof exportsMap !== 'object') return null
  const entry = exportsMap[subpath ? `./${subpath}` : '.']
  const target =
    typeof entry === 'string'
      ? entry
      : (entry?.default ?? entry?.import ?? entry?.types)
  return typeof target === 'string' ? withExtension(join(dir, target)) : null
}

function resolveImport(fromFile, specifier, appSrc) {
  if (specifier.startsWith('.'))
    return withExtension(resolve(dirname(fromFile), specifier))
  if (specifier.startsWith('@/'))
    return withExtension(join(appSrc, specifier.slice(2)))
  return resolvePackage(specifier)
}

function walk(dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, found)
    else if (ROUTE_FILE.test(entry.name)) found.push(path)
  }
  return found
}

function importsOf(source) {
  const bindings = new Map()
  for (const statement of source.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      statement.importClause?.isTypeOnly
    )
      continue
    const specifier = statement.moduleSpecifier.text
    const clause = statement.importClause
    if (!clause) continue
    if (clause.name) bindings.set(clause.name.text, specifier)
    const named = clause.namedBindings
    if (named && ts.isNamedImports(named))
      for (const element of named.elements)
        if (!element.isTypeOnly) bindings.set(element.name.text, specifier)
  }
  return bindings
}

function functionBindings(source) {
  const names = new Set()
  const visit = (node) => {
    if (ts.isFunctionDeclaration(node) && node.name) names.add(node.name.text)
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) ||
        ts.isFunctionExpression(node.initializer))
    )
      names.add(node.name.text)
    ts.forEachChild(node, visit)
  }
  visit(source)
  return names
}

function isFunctionValue(expression, localFunctions) {
  let node = expression
  while (ts.isParenthesizedExpression(node)) node = node.expression
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) return true
  return ts.isIdentifier(node) && localFunctions.has(node.text)
}

function checkApp(app) {
  const appSrc = join(root, 'apps', app, 'src')
  const appDir = join(appSrc, 'app')
  if (!existsSync(appDir)) return []

  const findings = []
  const seen = new Set()
  const queue = walk(appDir).filter((file) => !isClientModule(file))

  while (queue.length) {
    const file = queue.pop()
    if (seen.has(file)) continue
    seen.add(file)

    const source = parse(file)
    const imports = importsOf(source)
    const localFunctions = functionBindings(source)
    const resolved = new Map()
    for (const [name, specifier] of imports) {
      const target = resolveImport(file, specifier, appSrc)
      if (!target) continue
      resolved.set(name, target)
      if (!isClientModule(target) && !seen.has(target)) queue.push(target)
    }

    const visit = (node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(source).split('.')[0]
        const target = resolved.get(tag)
        if (target && isClientModule(target))
          for (const attribute of node.attributes.properties) {
            if (
              !ts.isJsxAttribute(attribute) ||
              !attribute.initializer ||
              !ts.isJsxExpression(attribute.initializer) ||
              !attribute.initializer.expression
            )
              continue
            if (
              !isFunctionValue(attribute.initializer.expression, localFunctions)
            )
              continue
            const { line } = source.getLineAndCharacterOfPosition(
              attribute.getStart(source)
            )
            findings.push(
              `${relative(root, file)}:${line + 1}  <${node.tagName.getText(source)} ${attribute.name.getText(source)}={…}>  → ${relative(root, target)}`
            )
          }
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  return findings
}

const requested = process.argv.slice(2)
const apps = requested.length
  ? requested
  : readdirSync(join(root, 'apps')).filter((name) =>
      existsSync(join(root, 'apps', name, 'src', 'app'))
    )

const findings = apps.flatMap(checkApp)
if (findings.length) {
  console.error(
    `Function props passed from a Server Component to a Client Component (React #441 in production):\n\n${findings.join('\n')}\n\nPass serializable data instead (a base href string, a key, plain options) and build the function inside the client component.`
  )
  process.exit(1)
}
console.log(`RSC boundaries OK (${apps.length} apps).`)
