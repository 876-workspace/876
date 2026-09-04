import MarkdownRenderer from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { cn } from '../lib/utils'

type MarkdownProps = { content: string; className?: string }

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
    <div
      className={cn(
        'text-foreground/90 [&_a]:text-info [&_blockquote]:border-border [&_blockquote]:text-muted-foreground [&_code]:bg-muted [&_hr]:border-border [&_pre]:bg-muted [&_td]:border-border [&_th]:border-border [&_th]:bg-muted text-sm leading-6 [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_h1]:mt-5 [&_h1]:text-[15px] [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:text-sm [&_h3]:font-medium [&_hr]:my-4 [&_li]:my-0.5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-3 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5',
        className
      )}
    >
      <MarkdownRenderer remarkPlugins={[remarkGfm]} urlTransform={safeUrl}>
        {content}
      </MarkdownRenderer>
    </div>
  )
}
