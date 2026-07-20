import Link from "next/link";

type LegalDocumentProps = {
  title: string;
  summary: string;
  children: React.ReactNode;
};

export function LegalDocument({
  title,
  summary,
  children,
}: LegalDocumentProps) {
  return (
    <main className="flex-1">
      <div className="border-b border-white/10 bg-primary px-4 py-12 text-white sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            TOL Barbershop legal
          </p>
          <h1 className="max-w-3xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-3xl text-pretty text-sm leading-7 text-white/70 sm:text-base">
            {summary}
          </p>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12 lg:px-8">
        <aside className="h-fit rounded-xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            Effective date
          </p>
          <p className="mt-2 text-sm font-semibold text-card-foreground">
            July 20, 2026
          </p>
          <div className="my-5 h-px bg-border" />
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Questions
          </p>
          <Link
            href="mailto:tolbarbershop23@gmail.com"
            className="mt-2 block break-words text-sm font-medium text-primary underline decoration-accent/50 underline-offset-4 hover:text-accent"
          >
            tolbarbershop23@gmail.com
          </Link>
        </aside>

        <article className="min-w-0 rounded-xl border border-border bg-card px-5 py-2 shadow-sm sm:px-8 [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:decoration-accent/50 [&_a]:underline-offset-4 hover:[&_a]:text-accent [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_li]:pl-1 [&_p]:leading-7 [&_section]:border-b [&_section]:border-border [&_section]:py-7 [&_section:last-child]:border-b-0 [&_strong]:font-semibold [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2">
          {children}
        </article>
      </div>
    </main>
  );
}
