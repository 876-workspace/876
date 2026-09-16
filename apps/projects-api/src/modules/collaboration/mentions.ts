export type MentionParseOptions = {
  selfUserId?: string | null
}

const MENTION_TOKEN_PATTERN = /@\[[^\]]*\]\(user:([^)\s]+)\)/g

/**
 * Extracts mentioned user ids from Markdown. Only the explicit
 * `@[label](user:<userId>)` token syntax counts — free-text `@name`
 * fragments are never treated as mentions.
 */
export function parseMentionedUserIds(
  body: string,
  options: MentionParseOptions = {}
): string[] {
  const seen = new Set<string>()
  const pattern = new RegExp(MENTION_TOKEN_PATTERN)
  let match: RegExpExecArray | null
  while ((match = pattern.exec(body)) !== null) {
    const userId = match[1]?.trim()
    if (!userId) continue
    if (options.selfUserId && userId === options.selfUserId) continue
    seen.add(userId)
  }
  return [...seen]
}
