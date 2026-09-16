import { renderEmailTemplate } from './templates.renderer.js'

describe('renderEmailTemplate', () => {
  it('renders subject variables', () => {
    expect(
      renderEmailTemplate({
        subject: 'Invoice {{invoice.number}}',
        html: '<p>Hello</p>',
        text: null,
        variables: { 'invoice.number': 'INV-1' },
      })
    ).toMatchObject({ subject: 'Invoice INV-1' })
  })

  it('renders HTML variables with escaping', () => {
    expect(
      renderEmailTemplate({
        subject: 'Invoice',
        html: '<p>Hello {{customer.name}}</p>',
        text: null,
        variables: { 'customer.name': '<script>alert(1)</script>' },
      })?.html
    ).toBe('<p>Hello &lt;script&gt;alert(1)&lt;/script&gt;</p>')
  })

  it('renders text variables without HTML escaping', () => {
    expect(
      renderEmailTemplate({
        subject: 'Invoice',
        html: '<p>Invoice</p>',
        text: 'Customer: {{customer.name}}',
        variables: { 'customer.name': 'A & B' },
      })?.text
    ).toBe('Customer: A & B')
  })

  it('renders numeric variables', () => {
    expect(
      renderEmailTemplate({
        subject: 'Balance {{invoice.balance}}',
        html: '<p>{{invoice.balance}}</p>',
        text: null,
        variables: { 'invoice.balance': 125.5 },
      })
    ).toMatchObject({ subject: 'Balance 125.5', html: '<p>125.5</p>' })
  })

  it('renders boolean variables', () => {
    expect(
      renderEmailTemplate({
        subject: 'Paid {{invoice.paid}}',
        html: '<p>{{invoice.paid}}</p>',
        text: null,
        variables: { 'invoice.paid': false },
      })
    ).toMatchObject({ subject: 'Paid false' })
  })

  it('accepts whitespace inside placeholder braces', () => {
    expect(
      renderEmailTemplate({
        subject: 'Invoice {{ invoice.number }}',
        html: '<p>Invoice</p>',
        text: null,
        variables: { 'invoice.number': 'INV-2' },
      })?.subject
    ).toBe('Invoice INV-2')
  })

  it('renders the same variable more than once', () => {
    expect(
      renderEmailTemplate({
        subject: '{{invoice.number}} / {{invoice.number}}',
        html: '<p>{{invoice.number}}</p>',
        text: null,
        variables: { 'invoice.number': 'INV-3' },
      })
    ).toMatchObject({ subject: 'INV-3 / INV-3', html: '<p>INV-3</p>' })
  })

  it('fails when a subject variable is missing', () => {
    expect(
      renderEmailTemplate({
        subject: 'Invoice {{invoice.number}}',
        html: '<p>Invoice</p>',
        text: null,
        variables: {},
      })
    ).toBeNull()
  })

  it('fails when an HTML variable is missing', () => {
    expect(
      renderEmailTemplate({
        subject: 'Invoice',
        html: '<p>{{customer.name}}</p>',
        text: null,
        variables: {},
      })
    ).toBeNull()
  })

  it('fails when rendered subject content contains a newline', () => {
    expect(
      renderEmailTemplate({
        subject: 'Invoice {{invoice.number}}',
        html: '<p>Invoice</p>',
        text: null,
        variables: { 'invoice.number': 'INV-1\nBcc: bad@example.com' },
      })
    ).toBeNull()
  })
})

describe('renderEmailTemplate inherited-property safety', () => {
  // Regression: a bare `variables[key]` resolved the prototype chain, so these
  // keys stringified a function body or "[object Object]" into a customer's
  // email instead of failing as a missing variable.
  it.each([
    'toString',
    'constructor',
    '__proto__',
    'valueOf',
    'hasOwnProperty',
  ])('fails instead of rendering the inherited property %s', (key) => {
    expect(
      renderEmailTemplate({
        subject: 'Invoice',
        html: `<p>{{${key}}}</p>`,
        text: null,
        variables: { customerName: 'Alejandra Reyes' },
      })
    ).toBeNull()
  })

  it('renders an own property that shadows an inherited name', () => {
    const result = renderEmailTemplate({
      subject: 'Invoice',
      html: '<p>{{toString}}</p>',
      text: null,
      variables: { toString: 'INV-1042' },
    })

    expect(result).toEqual({
      subject: 'Invoice',
      html: '<p>INV-1042</p>',
      text: null,
    })
  })

  it('fails when an own property is explicitly null', () => {
    expect(
      renderEmailTemplate({
        subject: 'Invoice',
        html: '<p>{{customerName}}</p>',
        text: null,
        variables: { customerName: null as unknown as string },
      })
    ).toBeNull()
  })

  it('does not mutate the supplied variable map', () => {
    const variables = { customerName: 'Alejandra Reyes' }

    renderEmailTemplate({
      subject: 'Invoice',
      html: '<p>{{customerName}}</p>',
      text: null,
      variables,
    })

    expect(variables).toEqual({ customerName: 'Alejandra Reyes' })
  })
})
