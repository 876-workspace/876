import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Markdown } from './markdown'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Markdown structure', () => {
  it('Nested lists, with indented items, render every nested entry', () => {
    render(
      <Markdown
        content={
          '- Review the failed nightly build\n  - Identify the flaky migration test\n  - Reassign the on-call owner\n- Publish the incident timeline'
        }
      />
    )

    expect(
      screen.getByText('Review the failed nightly build')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Identify the flaky migration test')
    ).toBeInTheDocument()
    expect(screen.getByText('Reassign the on-call owner')).toBeInTheDocument()
    expect(
      screen.getByText('Publish the incident timeline')
    ).toBeInTheDocument()
  })

  it('Ordered lists, with rollout steps, render each step in order', () => {
    render(
      <Markdown
        content={
          '1. Run the database migration\n2. Replay the queued webhook events\n3. Verify the billing totals'
        }
      />
    )

    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getByText('Run the database migration')).toBeInTheDocument()
    expect(
      screen.getByText('Replay the queued webhook events')
    ).toBeInTheDocument()
    expect(screen.getByText('Verify the billing totals')).toBeInTheDocument()
  })

  it('Task lists, with mixed items, render checked and unchecked boxes', () => {
    render(
      <Markdown
        content={
          '- [x] Freeze the release schema\n- [ ] Notify the support rotation'
        }
      />
    )

    expect(screen.getByRole('checkbox', { checked: true })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { checked: false })).toBeInTheDocument()
    expect(screen.getByText('Freeze the release schema')).toBeInTheDocument()
    expect(screen.getByText('Notify the support rotation')).toBeInTheDocument()
  })

  it('Fenced code, with a language tag, renders the code text as code', () => {
    render(
      <Markdown
        content={'```sql\nSELECT id FROM invoices WHERE past_due = true;\n```'}
      />
    )
    const code = document.querySelector('code.language-sql')

    expect(code).toHaveTextContent(
      'SELECT id FROM invoices WHERE past_due = true;'
    )
  })

  it('Nested blockquotes, with two levels, render both quoted passages', () => {
    const { container } = render(
      <Markdown
        content={
          '> The deploy window moved to Friday.\n>\n>> Only the hotfix train may land after Thursday.'
        }
      />
    )

    expect(
      screen.getByText('The deploy window moved to Friday.')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Only the hotfix train may land after Thursday.')
    ).toBeInTheDocument()
    expect(container.querySelector('blockquote')).not.toBeNull()
  })

  it('Aligned tables, with GFM alignment markers, render headers and cells', () => {
    render(
      <Markdown
        content={
          '| Service | Owner | Status |\n| :------ | :----: | -----: |\n| Billing API | Priya | Live |\n| Webhooks | Marco | Draining |'
        }
      />
    )

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Service' })
    ).toBeInTheDocument()
    expect(screen.getByText('Billing API')).toBeInTheDocument()
    expect(screen.getByText('Draining')).toBeInTheDocument()
  })
})

describe('Markdown links', () => {
  it('Javascript URL, in a release link, is dropped while the text stays visible', () => {
    render(<Markdown content={'[Release dashboard](javascript:alert(1))'} />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('Release dashboard')).toBeInTheDocument()
  })

  it('Data URL, in an export link, is dropped while the text stays visible', () => {
    render(
      <Markdown content={'[Export archive](data:text/plain;base64,aGVsbG8=)'} />
    )

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('Export archive')).toBeInTheDocument()
  })

  it('Vbscript URL, in a legacy report link, is dropped while the text stays visible', () => {
    render(<Markdown content={'[Legacy report](vbscript:MsgBox(1))'} />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('Legacy report')).toBeInTheDocument()
  })

  it('Http URL, in a status link, is kept with its href', () => {
    render(<Markdown content={'[Status page](http://status.example.com)'} />)
    const link = screen.getByRole('link', { name: 'Status page' })

    expect(link).toHaveAttribute('href', 'http://status.example.com')
  })

  it('Https URL, in a runbook link, is kept with its href', () => {
    render(
      <Markdown
        content={'[Deploy runbook](https://runbooks.example.com/deploy)'}
      />
    )
    const link = screen.getByRole('link', { name: 'Deploy runbook' })

    expect(link).toHaveAttribute('href', 'https://runbooks.example.com/deploy')
  })

  it('Mailto URL, in a support link, is kept with its href', () => {
    render(<Markdown content={'[Email support](mailto:support@example.com)'} />)
    const link = screen.getByRole('link', { name: 'Email support' })

    expect(link).toHaveAttribute('href', 'mailto:support@example.com')
  })

  it('Relative link, to onboarding docs, is kept with its original href', () => {
    render(<Markdown content={'[Onboarding guide](/docs/onboarding)'} />)
    const link = screen.getByRole('link', { name: 'Onboarding guide' })

    expect(link).toHaveAttribute('href', '/docs/onboarding')
  })

  it('Image, with alt text, renders an image with its source', () => {
    render(
      <Markdown
        content={
          '![Deploy pipeline diagram](https://cdn.example.com/pipeline.png)'
        }
      />
    )
    const image = screen.getByRole('img', { name: 'Deploy pipeline diagram' })

    expect(image).toHaveAttribute('src', 'https://cdn.example.com/pipeline.png')
  })

  it('Autolinked URL, in plain deploy text, renders a link to the logs', () => {
    render(
      <Markdown
        content={
          'Ship it, then watch https://logs.example.com/builds/42 for failures.'
        }
      />
    )
    const link = screen.getByRole('link', {
      name: 'https://logs.example.com/builds/42',
    })

    expect(link).toHaveAttribute('href', 'https://logs.example.com/builds/42')
  })
})

describe('Markdown robustness', () => {
  it('Empty string, with no content, renders no headings links or paragraphs', () => {
    const { container } = render(<Markdown content={''} />)

    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(container.querySelector('p')).toBeNull()
  })

  it('Long input, with five thousand characters, renders the full text', () => {
    const content = 'Release notes. '.repeat(340)
    render(<Markdown content={content} />)
    const paragraph = screen.getByText(/Release notes\./)

    expect(paragraph.textContent).toHaveLength(content.trimEnd().length)
    expect(paragraph.textContent).toContain('Release notes.')
  })

  it('Unicode text, with accents and emoji, preserves every character', () => {
    render(
      <Markdown
        content={
          '## Déploiement du vendredi 🚀\n\nÉtapes: vérifier Zürich, naïve café ☕'
        }
      />
    )

    expect(
      screen.getByRole('heading', { name: 'Déploiement du vendredi 🚀' })
    ).toBeInTheDocument()
    expect(screen.getByText(/Zürich/)).toBeInTheDocument()
    expect(screen.getByText(/☕/)).toBeInTheDocument()
  })

  it('Malformed table, with ragged rows, renders text without logging errors', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <Markdown
        content={'| Service | Owner |\n| - |\n| Billing | Priya | Extra |'}
      />
    )

    expect(screen.getByText(/Billing/)).toBeInTheDocument()
    expect(errorSpy).not.toHaveBeenCalled()
  })
})

describe('Markdown safety', () => {
  it('Image onerror payload, in raw HTML, creates no image element', () => {
    const { container } = render(
      <Markdown
        content={'<img src="https://cdn.example.com/x.png" onerror="alert(1)">'}
      />
    )

    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[onerror]')).toBeNull()
    expect(screen.getByText(/onerror/)).toBeInTheDocument()
  })

  it('Svg onload payload, in raw HTML, creates no svg element', () => {
    const { container } = render(
      <Markdown content={'<svg onload="alert(1)"></svg>'} />
    )

    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('[onload]')).toBeNull()
  })

  it('Button onclick payload, in raw HTML, renders no button element', () => {
    render(
      <Markdown content={'<button onclick="alert(1)">Claim refund</button>'} />
    )

    expect(
      screen.queryByRole('button', { name: 'Claim refund' })
    ).not.toBeInTheDocument()
    expect(screen.getByText(/Claim refund/)).toBeInTheDocument()
  })
})
