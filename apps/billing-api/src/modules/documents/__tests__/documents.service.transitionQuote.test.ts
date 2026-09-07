import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  retrieve: vi.fn(),
  transition: vi.fn(),
}))

vi.mock('../repositories/quotes', () => ({
  quotes: { retrieve: mocks.retrieve, transition: mocks.transition },
}))

import { documentsService } from '../documents.service'

const TENANT = 'ten_1'
const QUOTE = 'quo_1'

function quoteWith(status: string) {
  return { id: QUOTE, tenantId: TENANT, status }
}

/** Every legal transition, as the service's own table declares it. */
const LEGAL = [
  ['send', 'DRAFT', 'SENT', undefined],
  ['accept', 'SENT', 'ACCEPTED', 'acceptedAt'],
  ['decline', 'SENT', 'DECLINED', 'declinedAt'],
  ['cancel', 'DRAFT', 'CANCELED', 'canceledAt'],
  ['cancel', 'SENT', 'CANCELED', 'canceledAt'],
] as const

/** Source statuses each action must refuse. */
const ILLEGAL = [
  ['send', 'SENT'],
  ['send', 'ACCEPTED'],
  ['send', 'CANCELED'],
  ['accept', 'DRAFT'],
  ['accept', 'DECLINED'],
  ['decline', 'DRAFT'],
  ['decline', 'ACCEPTED'],
  ['cancel', 'ACCEPTED'],
  ['cancel', 'DECLINED'],
  ['cancel', 'EXPIRED'],
] as const

describe('documentsService.transitionQuote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.transition.mockResolvedValue(true)
  })

  it.each(LEGAL)(
    '%s moves a %s quote to %s and stamps %s',
    async (action, from, to, timestampField) => {
      mocks.retrieve.mockResolvedValue(quoteWith(from))

      await expect(
        documentsService.transitionQuote(TENANT, QUOTE, action)
      ).resolves.toEqual({ object: 'quote', id: QUOTE })

      expect(mocks.transition).toHaveBeenCalledTimes(1)
      expect(mocks.transition).toHaveBeenCalledWith(
        TENANT,
        QUOTE,
        from,
        to,
        timestampField
      )
    }
  )

  it.each(ILLEGAL)(
    'refuses to %s a %s quote with billing/quote-invalid-state',
    async (action, from) => {
      mocks.retrieve.mockResolvedValue(quoteWith(from))

      await expect(
        documentsService.transitionQuote(TENANT, QUOTE, action)
      ).rejects.toMatchObject({ code: 'billing/quote-invalid-state' })

      // The guard must block the write, not merely report afterwards.
      expect(mocks.transition).not.toHaveBeenCalled()
    }
  )

  it('reports a 409 for an illegal transition', async () => {
    mocks.retrieve.mockResolvedValue(quoteWith('ACCEPTED'))

    await expect(
      documentsService.transitionQuote(TENANT, QUOTE, 'send')
    ).rejects.toMatchObject({
      code: 'billing/quote-invalid-state',
      httpStatus: 409,
    })
  })

  it('rejects a quote that does not exist without attempting a write', async () => {
    mocks.retrieve.mockResolvedValue(null)

    await expect(
      documentsService.transitionQuote(TENANT, QUOTE, 'send')
    ).rejects.toBeTruthy()
    expect(mocks.transition).not.toHaveBeenCalled()
  })

  it('scopes the lookup to the calling tenant', async () => {
    mocks.retrieve.mockResolvedValue(quoteWith('DRAFT'))

    await documentsService.transitionQuote(TENANT, QUOTE, 'send')

    expect(mocks.retrieve).toHaveBeenCalledWith(TENANT, QUOTE)
  })

  it('treats a lost compare-and-set race as an invalid state', async () => {
    // The repository updates `where status = from`, so a concurrent transition
    // makes it match zero rows. That must surface as a conflict, never as a
    // success reporting a change that did not happen.
    mocks.retrieve.mockResolvedValue(quoteWith('DRAFT'))
    mocks.transition.mockResolvedValue(false)

    await expect(
      documentsService.transitionQuote(TENANT, QUOTE, 'send')
    ).rejects.toMatchObject({ code: 'billing/quote-invalid-state' })
  })

  it('does not stamp a timestamp when sending', async () => {
    mocks.retrieve.mockResolvedValue(quoteWith('DRAFT'))

    await documentsService.transitionQuote(TENANT, QUOTE, 'send')

    expect(mocks.transition).toHaveBeenCalledWith(
      TENANT,
      QUOTE,
      'DRAFT',
      'SENT',
      undefined
    )
  })
})
