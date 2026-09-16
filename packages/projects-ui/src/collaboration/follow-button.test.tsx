// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { FollowButton } from './follow-button'

describe('FollowButton', () => {
  afterEach(cleanup)

  it('renders Follow with aria-pressed false when not following', () => {
    render(<FollowButton following={false} action="/follow" />)

    const button = screen.getByRole('button', { name: 'Follow' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('renders Following with aria-pressed true when following', () => {
    render(<FollowButton following={true} action="/follow" />)

    const button = screen.getByRole('button', { name: 'Following' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('posts to the given action', () => {
    render(<FollowButton following={false} action="/projects/p_1/follow" />)

    const form = document.querySelector('form')
    expect(form).toHaveAttribute('action', '/projects/p_1/follow')
    expect(form).toHaveAttribute('method', 'post')
  })

  it('submits the opposite of the current following state', () => {
    render(<FollowButton following={true} action="/follow" />)

    const input = document.querySelector('input[name="following"]')
    expect(input).toHaveAttribute('value', 'false')
  })

  it('submits true when not following', () => {
    render(<FollowButton following={false} action="/follow" />)

    const input = document.querySelector('input[name="following"]')
    expect(input).toHaveAttribute('value', 'true')
  })

  it('renders the hidden input inside the form', () => {
    render(<FollowButton following={false} action="/follow" />)

    const form = document.querySelector('form')
    const input = document.querySelector('input[name="following"]')
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected a hidden following input')
    }
    expect(form).toContainElement(input)
  })

  it('renders a submit button', () => {
    render(<FollowButton following={false} action="/follow" />)

    expect(screen.getByRole('button', { name: 'Follow' })).toHaveAttribute(
      'type',
      'submit'
    )
  })
})
