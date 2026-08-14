import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { OfflineRecovery } from './offline-recovery'

describe('OfflineRecovery', () => {
  it('renders an accessible retry control and the precached recovery script', () => {
    const { container } = render(<OfflineRecovery className="retry" />)

    expect(screen.getByRole('button', { name: 'Try again' })).toHaveAttribute(
      'data-offline-retry'
    )
    expect(container.querySelector('script')).toHaveAttribute(
      'src',
      '/pwa/offline-recovery.js'
    )
  })
})
