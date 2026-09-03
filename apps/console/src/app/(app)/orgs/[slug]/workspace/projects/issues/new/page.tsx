import Link from 'next/link'
import { buttonVariants } from '@876/ui/button'
import { ArrowLeft } from '@876/ui/icons'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'New Issue • Issues - Organizations' }
}

export default async function NewIssuePage({ params }: Props) {
  const { slug } = await params
  const base = `/orgs/${slug}/workspace/projects/issues`

  return (
    <div className="space-y-6">
      <Link
        href={base}
        className={buttonVariants({
          variant: 'outline',
          size: 'sm',
          className: 'inline-flex items-center gap-1.5',
        })}
      >
        <ArrowLeft className="size-3.5" />
        Back to issues
      </Link>

      <div className="876-card max-w-xl p-6">
        <h1 className="text-lg font-semibold">Create a new issue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Issues belong to a project and track features, bugs, and tasks.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href={base}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}
