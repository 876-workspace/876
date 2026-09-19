import MarkdownRenderer from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'

import { MarkdownCodeBlock } from './markdown-code-block'
import { cn } from '../lib/utils'

type MarkdownProps = { content: string; className?: string }

const markdownTypography =
  'text-foreground/90 text-[0.9375rem] leading-7 [&_a]:text-info [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-border [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_h1]:mt-6 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:text-base [&_h3]:font-semibold [&_h4]:mt-3 [&_h4]:text-[0.9375rem] [&_h4]:font-semibold [&_hr]:my-4 [&_hr]:border-border [&_li]:my-0.5 [&_li:has(input[type=checkbox])]:list-none [&_li:has(input[type=checkbox])]:-ml-5 [&_li:has(input[type=checkbox])]:flex [&_li:has(input[type=checkbox])]:items-start [&_li:has(input[type=checkbox]:checked)]:text-muted-foreground [&_li_input[type=checkbox]]:mt-2 [&_li_input[type=checkbox]]:mr-2 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-3 [&_pre]:bg-transparent [&_pre]:p-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-2 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5'

function safeUrl(url: string): string {
  try {
    const protocol = new URL(url, 'https://876.local').protocol
    return ['http:', 'https:', 'mailto:'].includes(protocol) ? url : ''
  } catch {
    return ''
  }
}

export function Markdown({ content, className }: MarkdownProps) {
  return (
    <div className={cn(markdownTypography, className)}>
      <MarkdownRenderer
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [rehypeHighlight, { detect: true, ignoreMissing: true }],
        ]}
        urlTransform={safeUrl}
        components={{
          pre: MarkdownCodeBlock,
          table: ({ children, ...props }) => (
            <div className="-mx-4 my-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table {...props}>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </MarkdownRenderer>
    </div>
  )
}
