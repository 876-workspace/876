#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const AI_MARKER =
  /\b(?:codex|openai|claude|anthropic|ona(?:-agent)?|grok|xai|gemini|copilot|muse|cursor|windsurf|devin|opencode|aider)\b/i

const ATTRIBUTION_TRAILER =
  /^\s*(?:co-authored-by|coauthored-by|authored-by|signed-off-by):\s*(.+)$/gim

const GENERATED_WITH =
  /^\s*(?:generated|created|assisted)\s+(?:with|by)\s+(.+)$/gim

function findForbiddenMessageAttribution(message) {
  const matches = []

  for (const pattern of [ATTRIBUTION_TRAILER, GENERATED_WITH]) {
    pattern.lastIndex = 0
    let match

    while ((match = pattern.exec(message)) !== null) {
      if (AI_MARKER.test(match[1])) matches.push(match[0].trim())
    }
  }

  return matches
}

function findForbiddenIdentity(label, identity) {
  return identity && AI_MARKER.test(identity) ? [`${label}: ${identity}`] : []
}

function fail(entries) {
  console.error('AI attribution is forbidden in this repository.')
  console.error('Git authorship and co-authorship must identify human contributors only.\n')

  for (const entry of entries) {
    console.error(entry.label)
    for (const line of entry.matches) console.error(`  ${line}`)
  }

  process.exit(1)
}

function currentIdentity(variable) {
  return execFileSync('git', ['var', variable], { encoding: 'utf8' }).trim()
}

function checkMessageFile(path) {
  const message = readFileSync(path, 'utf8')
  const matches = [
    ...findForbiddenIdentity('Author', currentIdentity('GIT_AUTHOR_IDENT')),
    ...findForbiddenIdentity('Committer', currentIdentity('GIT_COMMITTER_IDENT')),
    ...findForbiddenMessageAttribution(message),
  ]

  if (matches.length > 0) fail([{ label: `Commit message: ${path}`, matches }])
}

function readCommits(range) {
  const output = execFileSync(
    'git',
    ['log', '--format=%H%x00%an <%ae>%x00%cn <%ce>%x00%B%x00', range],
    { encoding: 'utf8' },
  )

  const parts = output.split('\0')
  const commits = []

  for (let index = 0; index + 3 < parts.length; index += 4) {
    const sha = parts[index]?.trim()
    const author = parts[index + 1]?.trim() ?? ''
    const committer = parts[index + 2]?.trim() ?? ''
    const message = parts[index + 3] ?? ''
    if (sha) commits.push({ sha, author, committer, message })
  }

  return commits
}

function checkRange(range) {
  const offenders = []

  for (const commit of readCommits(range)) {
    const matches = [
      ...findForbiddenIdentity('Author', commit.author),
      ...findForbiddenIdentity('Committer', commit.committer),
      ...findForbiddenMessageAttribution(commit.message),
    ]

    if (matches.length > 0) {
      offenders.push({ label: `Commit ${commit.sha}`, matches })
    }
  }

  if (offenders.length > 0) fail(offenders)
}

const args = process.argv.slice(2)

if (args[0] === '--message-file') {
  if (!args[1]) throw new Error('--message-file requires a path')
  checkMessageFile(args[1])
} else {
  checkRange(args[0] ?? 'HEAD^..HEAD')
}
