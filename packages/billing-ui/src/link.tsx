'use client'

import {
  createContext,
  useContext,
  type AnchorHTMLAttributes,
  type ComponentType,
  type ForwardRefExoticComponent,
  type ReactNode,
  type RefAttributes,
} from 'react'

export type BillingUiLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
> & {
  href: string
  children?: ReactNode
}

export type BillingUiLinkComponent =
  | ComponentType<BillingUiLinkProps>
  | ForwardRefExoticComponent<
      BillingUiLinkProps & RefAttributes<HTMLAnchorElement>
    >

const BillingUiLinkContext = createContext<BillingUiLinkComponent | null>(null)

export function BillingUiLinkProvider({
  component,
  children,
}: {
  component: BillingUiLinkComponent
  children: ReactNode
}) {
  return (
    <BillingUiLinkContext.Provider value={component}>
      {children}
    </BillingUiLinkContext.Provider>
  )
}

export function Link(props: BillingUiLinkProps) {
  const Component = useContext(BillingUiLinkContext)

  if (Component) return <Component {...props} />

  return <a {...props} />
}
