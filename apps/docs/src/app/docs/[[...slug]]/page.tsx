import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/page'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getMDXComponents } from '@/mdx-components'
import { source } from '@/lib/source'

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>
}) {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) notFound()

  const MDXContent = page.data.body

  return (
    // [A5] Trim the top padding — Fumadocs' DocsPage hardcodes py-12 (3rem), which
    // pushes the overview/title too far down. tailwind-merge lets `pt-6` override
    // only the top. See style-refresh-tracker.md.
    <DocsPage toc={page.data.toc} full={page.data.full} className="pt-6">
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDXContent components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  )
}

export function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>
}): Promise<Metadata> {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) notFound()

  return {
    title: page.data.title,
    description: page.data.description,
  }
}
