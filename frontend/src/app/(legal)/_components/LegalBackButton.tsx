"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function LegalBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Return to the previous page"
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-primary transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <ArrowLeft className="size-5" aria-hidden="true" />
    </button>
  );
}
