/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockListCountries, mockListRegions } = vi.hoisted(() => ({
  mockListCountries: vi.fn(),
  mockListRegions: vi.fn(),
}))

vi.mock('@/lib/client', () => ({
  client: {
    geo: { listCountries: mockListCountries, listRegions: mockListRegions },
  },
}))

import {
  AddressFields,
  emptyAddressValue,
  toAddressParams,
  type AddressFieldsValue,
} from './address-fields'

const COUNTRIES = [
  { code: 'JM', name: 'Jamaica' },
  { code: 'US', name: 'United States' },
  { code: 'AI', name: 'Anguilla' },
]

const JM_REGIONS = [
  { code: 'JM-01', name: 'Kingston', type: 'parish' },
  { code: 'JM-02', name: 'Saint Andrew', type: 'parish' },
]

const US_REGIONS = [{ code: 'US-FL', name: 'Florida', type: 'state' }]

function renderFields(value: AddressFieldsValue, onChange = vi.fn()) {
  render(<AddressFields value={value} onChange={onChange} />)
  return onChange
}

describe('AddressFields', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListCountries.mockResolvedValue({ data: COUNTRIES, error: null })
    mockListRegions.mockResolvedValue({ data: JM_REGIONS, error: null })
  })

  it('labels the region control with the country’s own vocabulary for Jamaica', async () => {
    renderFields(emptyAddressValue('JM'))

    expect(await screen.findByLabelText('Parish')).toBeInTheDocument()
  })

  it('labels the region control State for the United States', async () => {
    mockListRegions.mockResolvedValue({ data: US_REGIONS, error: null })

    renderFields({ ...emptyAddressValue('US') })

    expect(await screen.findByLabelText('State')).toBeInTheDocument()
  })

  it('requests the regions for the selected country', async () => {
    renderFields(emptyAddressValue('JM'))

    await waitFor(() => expect(mockListRegions).toHaveBeenCalledWith('JM'))
  })

  it('clears the previously selected region when the country changes', async () => {
    const user = userEvent.setup()
    const onChange = renderFields({
      ...emptyAddressValue('JM'),
      regionCode: 'JM-02',
    })

    await screen.findByLabelText('Parish')
    await user.click(screen.getByLabelText('Country'))
    await user.click(
      await screen.findByRole('option', { name: 'United States' })
    )

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ countryCode: 'US', regionCode: '' })
    )
  })

  it('renders no region control for a country with no subdivisions', async () => {
    mockListRegions.mockResolvedValue({ data: [], error: null })

    renderFields(emptyAddressValue('AI'))

    await waitFor(() => expect(mockListRegions).toHaveBeenCalledWith('AI'))
    expect(screen.queryByLabelText('Region')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Parish')).not.toBeInTheDocument()
  })

  it('reports that geography is unavailable when the catalog fails', async () => {
    mockListCountries.mockResolvedValue({
      data: null,
      error: { message: 'unavailable' },
    })
    const onUnavailable = vi.fn()

    render(
      <AddressFields
        value={emptyAddressValue('JM')}
        onChange={vi.fn()}
        onGeographyUnavailable={onUnavailable}
      />
    )

    await waitFor(() => expect(onUnavailable).toHaveBeenCalledWith(true))
    expect(
      await screen.findByText('Country information could not be loaded.')
    ).toBeInTheDocument()
  })

  it('populates existing values', async () => {
    renderFields({
      line1: '1 Knutsford Boulevard',
      line2: 'Suite 4',
      city: 'Kingston',
      countryCode: 'JM',
      regionCode: 'JM-02',
      postalCode: 'JMAKN05',
    })

    expect(screen.getByLabelText('Address line 1')).toHaveValue(
      '1 Knutsford Boulevard'
    )
    expect(screen.getByLabelText('Address line 2')).toHaveValue('Suite 4')
    expect(screen.getByLabelText('City')).toHaveValue('Kingston')
    expect(screen.getByLabelText('Postal code')).toHaveValue('JMAKN05')
  })
})

describe('toAddressParams', () => {
  it('omits blank optional fields rather than sending empty strings', () => {
    const params = toAddressParams(
      {
        line1: ' 1 Knutsford Boulevard ',
        line2: '   ',
        city: ' Kingston ',
        countryCode: 'JM',
        regionCode: '',
        postalCode: '',
      },
      'Kingston Main'
    )

    expect(params).toEqual({
      name: 'Kingston Main',
      line1: '1 Knutsford Boulevard',
      city: 'Kingston',
      countryCode: 'JM',
    })
  })

  it('includes the region and postal code when present', () => {
    const params = toAddressParams(
      {
        line1: '1 Knutsford Boulevard',
        line2: 'Suite 4',
        city: 'Kingston',
        countryCode: 'JM',
        regionCode: 'JM-02',
        postalCode: 'JMAKN05',
      },
      'Kingston Main'
    )

    expect(params).toEqual({
      name: 'Kingston Main',
      line1: '1 Knutsford Boulevard',
      line2: 'Suite 4',
      city: 'Kingston',
      countryCode: 'JM',
      regionCode: 'JM-02',
      postalCode: 'JMAKN05',
    })
  })
})
