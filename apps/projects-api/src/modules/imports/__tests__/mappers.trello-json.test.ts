import { describe, expect, it } from 'vitest'

import { mapTrelloJson } from '../mappers/trello-json.js'

function board(overrides = {}) {
  return {
    name: 'Launch',
    lists: [
      { id: 'list_doing', name: 'Doing' },
      { id: 'list_done', name: 'Done' },
    ],
    cards: [
      {
        id: 'card_1',
        name: 'Ship it',
        desc: 'Big launch',
        due: '2024-02-01T00:00:00.000Z',
        closed: false,
        idList: 'list_doing',
        labels: [{ name: 'launch', color: 'green' }],
      },
    ],
    ...overrides,
  }
}

describe('mapTrelloJson', () => {
  it('maps cards with list-derived status', () => {
    const result = mapTrelloJson(JSON.stringify(board()))
    expect(result.rowErrors).toEqual([])
    expect(result.bundle.rows[0]).toEqual({
      kind: 'work-item',
      workItem: expect.objectContaining({
        title: 'Ship it',
        description: 'Big launch',
        status: 'in-progress',
        labels: ['launch'],
        externalRef: 'card_1',
      }),
    })
  })

  it('maps closed cards to done', () => {
    const payload = board()
    payload.cards[0] = { ...payload.cards[0], closed: true }
    const result = mapTrelloJson(JSON.stringify(payload))
    expect(result.bundle.rows[0]).toEqual({
      kind: 'work-item',
      workItem: expect.objectContaining({ status: 'done' }),
    })
  })

  it('requires card names', () => {
    const payload = board()
    payload.cards[0] = { ...payload.cards[0], name: '' }
    const result = mapTrelloJson(JSON.stringify(payload))
    expect(result.rowErrors).toEqual([
      { rowIndex: 0, message: 'Card name is required.' },
    ])
  })

  it('reports unknown board and card fields', () => {
    const payload = board({ prefs: { foo: 1 } }) as {
      lists: Array<{ id: string; name: string }>
      cards: Array<Record<string, unknown>>
    } & Record<string, unknown>
    payload.cards[0] = { ...payload.cards[0], customFieldItems: [] }
    const result = mapTrelloJson(JSON.stringify(payload))
    expect(result.unmappedFields).toContain('prefs')
    expect(result.unmappedFields).toContain('cards.customFieldItems')
  })

  it('rejects payloads without cards', () => {
    const result = mapTrelloJson(JSON.stringify({ name: 'Empty' }))
    expect(result.rowErrors).toEqual([
      {
        rowIndex: 0,
        message: 'Expected a Trello board export with a cards array.',
      },
    ])
  })

  it('rejects invalid json', () => {
    expect(mapTrelloJson('{nope').rowErrors).toHaveLength(1)
  })
})
