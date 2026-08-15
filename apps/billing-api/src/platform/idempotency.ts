import { createHash } from 'node:crypto'

import { AppHttpError } from '@/platform/errors'

type CanonicalNumber = { kind: 'number'; raw: string }
type CanonicalJson =
  | null
  | boolean
  | string
  | CanonicalNumber
  | CanonicalJson[]
  | { [key: string]: CanonicalJson }

function invalidJson(): never {
  throw new AppHttpError({
    code: 'validation/invalid-request',
    message: 'The integration payload contains invalid JSON.',
    httpStatus: 422,
  })
}

class CanonicalJsonParser {
  private index = 0

  constructor(private readonly source: string) {}

  parse(): CanonicalJson {
    const value = this.value()
    this.whitespace()
    if (this.index !== this.source.length) invalidJson()

    return value
  }

  private value(): CanonicalJson {
    this.whitespace()
    const character = this.source[this.index]
    if (character === 'n') return this.literal('null', null)
    if (character === 't') return this.literal('true', true)
    if (character === 'f') return this.literal('false', false)
    if (character === '"') return this.string()
    if (character === '[') return this.array()
    if (character === '{') return this.object()
    if (
      character === '-' ||
      (character !== undefined && /[0-9]/.test(character))
    ) {
      return this.number()
    }
    return invalidJson()
  }

  private literal<T extends null | boolean>(token: string, value: T): T {
    if (this.source.slice(this.index, this.index + token.length) !== token)
      invalidJson()
    this.index += token.length

    return value
  }

  private string(): string {
    const start = this.index
    this.index += 1
    let escaped = false
    while (this.index < this.source.length) {
      const character = this.source[this.index++]!
      if (escaped) {
        escaped = false
        continue
      }
      if (character === '\\') {
        escaped = true
        continue
      }
      if (character === '"') {
        try {
          return JSON.parse(this.source.slice(start, this.index)) as string
        } catch {
          return invalidJson()
        }
      }
    }
    return invalidJson()
  }

  private number(): CanonicalNumber {
    const match = this.source
      .slice(this.index)
      .match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/)
    if (!match) return invalidJson()
    this.index += match[0].length

    return { kind: 'number', raw: match[0] }
  }

  private array(): CanonicalJson[] {
    this.index += 1
    const values: CanonicalJson[] = []
    this.whitespace()
    if (this.source[this.index] === ']') {
      this.index += 1
      return values
    }
    while (true) {
      values.push(this.value())
      this.whitespace()
      const character = this.source[this.index++]
      if (character === ']') return values
      if (character !== ',') return invalidJson()
    }
  }

  private object(): { [key: string]: CanonicalJson } {
    this.index += 1
    const value: { [key: string]: CanonicalJson } = {}
    this.whitespace()
    if (this.source[this.index] === '}') {
      this.index += 1
      return value
    }
    while (true) {
      this.whitespace()
      if (this.source[this.index] !== '"') return invalidJson()
      const key = this.string()
      this.whitespace()
      if (this.source[this.index++] !== ':') return invalidJson()
      value[key] = this.value()
      this.whitespace()
      const character = this.source[this.index++]
      if (character === '}') return value
      if (character !== ',') return invalidJson()
    }
  }

  private whitespace(): void {
    while (/\s/.test(this.source[this.index] ?? '')) this.index += 1
  }
}

function pythonJsonString(value: string): string {
  let result = '"'
  for (const character of value) {
    const codePoint = character.codePointAt(0)!
    if (character === '"') result += '\\"'
    else if (character === '\\') result += '\\\\'
    else if (character === '\b') result += '\\b'
    else if (character === '\f') result += '\\f'
    else if (character === '\n') result += '\\n'
    else if (character === '\r') result += '\\r'
    else if (character === '\t') result += '\\t'
    else if (codePoint >= 0x20 && codePoint <= 0x7e) result += character
    else if (codePoint <= 0xffff)
      result += `\\u${codePoint.toString(16).padStart(4, '0')}`
    else {
      const offset = codePoint - 0x10000
      const high = 0xd800 + (offset >> 10)
      const low = 0xdc00 + (offset & 0x3ff)
      result += `\\u${high.toString(16)}\\u${low.toString(16)}`
    }
  }

  return `${result}"`
}

function comparePythonStrings(left: string, right: string): number {
  const a = [...left].map((value) => value.codePointAt(0)!)
  const b = [...right].map((value) => value.codePointAt(0)!)
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    if (a[index] !== b[index]) return a[index]! - b[index]!
  }

  return a.length - b.length
}

function scientificFromDigits(value: number, exponent: number): string {
  const absolute = Math.abs(value)
  const fixed = absolute.toString()
  let digits: string
  if (fixed.includes('e')) {
    const [mantissa] = fixed.split('e')
    digits = mantissa!.replace('.', '')
  } else {
    digits = fixed.replace('.', '').replace(/^0+/, '').replace(/0+$/, '') || '0'
  }
  const mantissa =
    digits.length === 1 ? digits : `${digits[0]}.${digits.slice(1)}`
  const sign = value < 0 || Object.is(value, -0) ? '-' : ''
  const exponentSign = exponent >= 0 ? '+' : '-'

  return `${sign}${mantissa}e${exponentSign}${Math.abs(exponent).toString().padStart(2, '0')}`
}

function pythonFloat(raw: string): string {
  const value = Number(raw)
  if (!Number.isFinite(value)) invalidJson()
  if (Object.is(value, -0)) return '-0.0'
  if (value === 0) return '0.0'

  const absolute = Math.abs(value)
  const exponent = Math.floor(Math.log10(absolute))
  if (exponent < -4 || exponent >= 16)
    return scientificFromDigits(value, exponent)

  const fixed = value.toString()
  return Number.isInteger(value) ? `${fixed}.0` : fixed
}

function canonicalNumber(value: CanonicalNumber): string {
  if (!/[.eE]/.test(value.raw)) return `number:${BigInt(value.raw).toString()}`

  return `number:${pythonFloat(value.raw)}`
}

function isCanonicalNumber(value: CanonicalJson): value is CanonicalNumber {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'kind' in value &&
    value.kind === 'number'
  )
}

function canonicalize(value: CanonicalJson): string {
  if (value === null) return 'null'
  if (typeof value === 'boolean')
    return value ? 'boolean:true' : 'boolean:false'
  if (typeof value === 'string') return `string:${pythonJsonString(value)}`
  if (Array.isArray(value))
    return `array:[${value.map(canonicalize).join(',')}]`
  if (isCanonicalNumber(value)) return canonicalNumber(value)
  const members = Object.keys(value)
    .sort(comparePythonStrings)
    .map((key) => `${pythonJsonString(key)}:${canonicalize(value[key]!)}`)

  return `object:{${members.join(',')}}`
}

export function canonicalizeJson(source: string): string {
  return canonicalize(new CanonicalJsonParser(source).parse())
}

export function idempotencyHash(source: string): string {
  return createHash('sha256').update(canonicalizeJson(source)).digest('hex')
}

export function integrationPayloadHash(source: string): string {
  const parsed = new CanonicalJsonParser(source).parse()
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    Array.isArray(parsed) ||
    isCanonicalNumber(parsed)
  ) {
    invalidJson()
  }

  const payload = { ...parsed }
  const sourceExternalReference = payload.sourceExternalReference ?? null
  delete payload.sourceExternalReference
  delete payload.sourceAppId
  delete payload.sourceIdempotencyKey
  delete payload.sourcePayloadHash

  return createHash('sha256')
    .update(canonicalize({ payload, sourceExternalReference }))
    .digest('hex')
}
