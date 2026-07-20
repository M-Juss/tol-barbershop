import { Scissors } from "lucide-react";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
}: SectionHeadingProps) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
      <div className="mb-4 flex items-center justify-center gap-2 text-accent sm:gap-3">
        <span className="h-px w-6 bg-accent/70 sm:w-12" />
        <Scissors className="h-5 w-5" aria-hidden="true" />
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] sm:text-xs sm:tracking-[0.24em]">
          {eyebrow}
        </span>
        <span className="h-px w-6 bg-accent/70 sm:w-12" />
      </div>
      <h2 className="text-balance text-3xl font-semibold tracking-tight text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)] sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-pretty text-sm leading-6 text-white/65 drop-shadow-[0_2px_5px_rgba(0,0,0,0.4)] sm:text-base">
        {description}
      </p>
    </div>
  );
}
