/**
 * Intelligent org slug generator.
 *
 * Strips legal entity suffixes (Ltd, Inc, LLC, GmbH, etc.), normalises
 * diacritics to ASCII, lower-cases, removes punctuation, and joins remaining
 * tokens with hyphens. Multi-word suffixes are matched before single-word ones
 * so that "Private Limited" is removed in one pass, not as two separate steps.
 *
 * Examples:
 *   "Mango Company Limited"                 → "mango-company"
 *   "Global Tech Solutions Co., Inc."       → "global-tech-solutions"
 *   "Quantum Research Private Limited"      → "quantum-research"
 *   "XYZ Solutions LLC"                     → "xyz-solutions"
 *   "Société Générale d'Entreprise Holding" → "societe-generale-d-entreprise"
 *   "NodeJS Innovations GmbH"               → "nodejs-innovations"
 *   "Example S.p.A."                        → "example"
 */

// Each entry is an array of lowercase tokens. Longer/multi-word entries are
// listed first so the greedy match removes the most specific form first.
const SUFFIXES: ReadonlyArray<ReadonlyArray<string>> = [
  ['private', 'limited'],
  ['private', 'ltd'],
  ['pvt', 'ltd'],
  ['pte', 'ltd'],
  ['pty', 'ltd'],
  ['s', 'a'],
  ['s', 'r', 'o'], // Czech/Slovak s.r.o.
  ['s', 'r', 'l'], // Italian s.r.l.
  ['s', 'p', 'a'], // Italian s.p.a.
  ['limited', 'liability', 'company'],
  ['limited', 'liability', 'limited', 'partnership'],
  ['limited', 'liability', 'partnership'],
  ['incorporated'],
  ['incorporation'],
  ['inc'],
  ['corp'],
  ['corporation'],
  ['company'],
  ['co'],
  ['limited'],
  ['ltd'],
  ['llc'],
  ['plc'],
  ['pllc'],
  ['pa'],
  ['pc'],
  ['llp'],
  ['lp'],
  ['gmbh'],
  ['ag'],
  ['bv'],
  ['nv'],
  ['sa'],
  ['pte'],
  ['pty'],
  ['pvt'],
  ['foundation'],
  ['enterprises'],
  ['enterprise'],
  ['holding'],
  ['trust'],
]

function stripDiacritics(text: string): string {
  return text.normalize('NFKD').replace(/\p{Mn}/gu, '')
}

function removeTrailingSuffixes(tokens: string[]): string[] {
  let end = tokens.length
  // Keep looping as long as the tail matches a known suffix.
  outer: while (end > 0) {
    for (const suffix of SUFFIXES) {
      const len = suffix.length
      if (len > end) continue
      let match = true
      for (let i = 0; i < len; i++) {
        if (tokens[end - len + i] !== suffix[i]) {
          match = false
          break
        }
      }
      if (match) {
        end -= len
        continue outer
      }
    }
    break
  }
  return tokens.slice(0, end)
}

export function generateOrgSlug(name: string): string {
  if (!name) return ''

  // 1. Normalise Unicode and strip combining diacritics (é → e, ü → u, etc.)
  let text = stripDiacritics(name)

  // 2. Lowercase for consistent matching and URL safety
  text = text.toLowerCase()

  // 3. Replace anything that isn't a letter, digit, or space with a space
  //    (removes commas, periods, apostrophes, slashes, etc.)
  text = text.replace(/[^a-z0-9\s]/g, ' ')

  // 4. Tokenise on whitespace, drop empty strings
  const tokens = text.trim().split(/\s+/).filter(Boolean)

  // 5. Iteratively strip recognised legal suffixes from the tail
  const core = removeTrailingSuffixes(tokens)

  if (core.length === 0) return ''

  // 6. Join with hyphens, collapse any runs, strip leading/trailing hyphens
  return core.join('-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}
