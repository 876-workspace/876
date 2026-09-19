/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { UserMenu } from './user-menu'

describe('UserMenu', () => {
  it('links the Install app entry to /install', async () => {
    const user = userEvent.setup()
    render(
      <UserMenu
        user={{
          name: 'Taylor Jones',
          email: 'taylor@example.com',
          avatar: null,
        }}
        showThemeSwitcher={false}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Open account menu' }))

    expect(screen.getByRole('link', { name: 'Install app' })).toHaveAttribute(
      'href',
      '/install'
    )
  })
})
