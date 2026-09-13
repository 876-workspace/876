import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react'

type AnyProps = Record<string, unknown> & { children?: ReactNode }

function isAsyncComponent(
  type: unknown
): type is (props: AnyProps) => Promise<ReactNode> {
  return typeof type === 'function' && type.constructor.name === 'AsyncFunction'
}

/**
 * Testing Library renders on the client, where an async Server Component
 * behind a `<Suspense>` never resolves. This awaits every async component in
 * a server-rendered tree so a test sees what the stream eventually delivers.
 * A `notFound()` thrown by a streamed component propagates as a rejection.
 */
export async function resolveServerTree(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node)) return Promise.all(node.map(resolveServerTree))
  if (!isValidElement(node)) return node

  const element = node as ReactElement<AnyProps>
  if (isAsyncComponent(element.type))
    return resolveServerTree(await element.type(element.props))

  if (element.props.children === undefined) return element

  const children = await Promise.all(
    Children.toArray(element.props.children).map(resolveServerTree)
  )
  return cloneElement(element, undefined, ...children)
}
