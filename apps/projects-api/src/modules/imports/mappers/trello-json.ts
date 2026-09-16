import type {
  ImportRowError,
  ImportRowInput,
  MapperResult,
} from '../import.types.js'
// Vendor reference: Trello board JSON export (Board menu > More > Print,
// export, and share > Export JSON).
// https://support.atlassian.com/trello/docs/exporting-data-from-trello/
type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null
    ? (value as JsonRecord)
    : null
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

const KNOWN_CARD_FIELDS = new Set([
  'id',
  'name',
  'desc',
  'due',
  'dueComplete',
  'closed',
  'idList',
  'labels',
  'idMembers',
  'shortUrl',
  'url',
  'pos',
])

export function mapTrelloJson(text: string): MapperResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    return {
      bundle: { rows: [] },
      rowErrors: [{ rowIndex: 0, message: 'Payload is not valid JSON.' }],
      unmappedFields: [],
      notes: [],
    }
  }
  const board = asRecord(parsed)
  if (!board || !Array.isArray(board.cards)) {
    return {
      bundle: { rows: [] },
      rowErrors: [{ rowIndex: 0, message: 'Expected a Trello board export with a cards array.' }],
      unmappedFields: [],
      notes: [],
    }
  }
  const lists = new Map<string, string>()
  if (Array.isArray(board.lists))
    for (const entry of board.lists as unknown[]) {
      const list = asRecord(entry)
      if (list) lists.set(asString(list.id), asString(list.name))
    }
  const rows: ImportRowInput[] = []
  const rowErrors: ImportRowError[] = []
  const unmapped = new Set<string>()
  const notes: string[] = [
    'Trello list placement maps to status: closed cards become done, otherwise the list name is normalized and anything unrecognized falls back to todo.',
  ]
  for (const key of Object.keys(board)) {
    if (!['cards', 'lists', 'name', 'desc', 'url', 'shortUrl', 'id'].includes(key))
      unmapped.add(key)
  }
  const cards = board.cards as unknown[]
  cards.forEach((candidate, rowIndex) => {
    const card = asRecord(candidate)
    if (!card) {
      rowErrors.push({ rowIndex, message: 'Card entry is not an object.' })
      return
    }
    for (const key of Object.keys(card))
      if (!KNOWN_CARD_FIELDS.has(key)) unmapped.add(`cards.${key}`)
    const title = asString(card.name)
    if (title === '') {
      rowErrors.push({ rowIndex, message: 'Card name is required.' })
      return
    }
    const closed = card.closed === true
    const listName = lists.get(asString(card.idList)) ?? ''
    const status = closed
      ? 'done'
      : /review|qa/i.test(listName)
        ? 'in-review'
        : /doing|progress|working/i.test(listName)
          ? 'in-progress'
          : /backlog/i.test(listName)
            ? 'backlog'
            : 'todo'
    const rawLabels = Array.isArray(card.labels)
      ? (card.labels as unknown[])
          .map((label) => asString(asRecord(label)?.name))
          .filter((name) => name !== '')
      : []
    const dueRaw = asString(card.due)
    rows.push({
      kind: 'work-item',
      workItem: {
        title,
        description: asString(card.desc) || null,
        status,
        priority: null,
        labels: rawLabels.length > 0 ? rawLabels : null,
        dueDate:
          dueRaw === '' || Number.isNaN(Date.parse(dueRaw))
            ? null
            : Math.floor(Date.parse(dueRaw) / 1000),
        externalRef: asString(card.id) || null,
      },
    })
  })
  return {
    bundle: { rows },
    rowErrors,
    unmappedFields: [...unmapped].sort(),
    notes,
  }
}
