export function AccountPage({ title }: { title: string }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <section
        aria-label={`${title} content`}
        className="border-border/70 bg-card/95 dark:bg-card/80 min-h-[22rem] rounded-[1.6rem] border shadow-[0_22px_70px_rgb(15_23_42_/_7%)] dark:shadow-[0_24px_80px_rgb(0_0_0_/_28%)]"
      />
    </div>
  )
}
