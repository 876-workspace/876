import { describe, expect, it } from 'vitest'

import { PaymentModeUpdateSchema } from '../schemas/payment'

describe('PaymentModeUpdateSchema image fields', () => {
  it('accepts a Storage file with its https display URL', () => {
    expect(
      PaymentModeUpdateSchema.safeParse({
        imageFileId: 'file_1',
        imageUrl: 'https://assets.876.test/file_1.png',
      }).success
    ).toBe(true)
  })

  it('accepts clearing the file and URL together', () => {
    expect(
      PaymentModeUpdateSchema.safeParse({ imageFileId: null, imageUrl: null })
        .success
    ).toBe(true)
  })

  it('rejects a display URL without its Storage file', () => {
    expect(
      PaymentModeUpdateSchema.safeParse({
        imageUrl: 'https://assets.876.test/file_1.png',
      }).success
    ).toBe(false)
  })

  it('rejects a Storage file without a display URL', () => {
    expect(
      PaymentModeUpdateSchema.safeParse({ imageFileId: 'file_1' }).success
    ).toBe(false)
  })

  it.each([
    'http://assets.876.test/file_1.png',
    'javascript:alert(1)',
    'data:image/png;base64,AAAA',
  ])('rejects the non-https image URL %s', (imageUrl) => {
    expect(
      PaymentModeUpdateSchema.safeParse({ imageFileId: 'file_1', imageUrl })
        .success
    ).toBe(false)
  })

  it('rejects an image file id that is not a Storage file', () => {
    expect(
      PaymentModeUpdateSchema.safeParse({
        imageFileId: 'upl_1',
        imageUrl: 'https://assets.876.test/upl_1.png',
      }).success
    ).toBe(false)
  })
})
