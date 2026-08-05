import Image from "next/image";
import Link from "next/link";

import { LegalBackButton } from "@/app/(legal)/_components/LegalBackButton";

const legalLinks = [
  { href: "/privacy-policy", label: "Privacy" },
  { href: "/terms-of-use", label: "Terms" },
];

export default function LegalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b border-border bg-card px-4 py-3 shadow-sm sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <LegalBackButton />
          <Link
            href="/"
            className="flex w-fit items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            <Image
              src="/tol-rounded-logo.png"
              alt="TOL Barbershop logo"
              width={40}
              height={40}
              className="rounded-3xl shadow-md shadow-black/20"
              priority
            />
            <span>
              <span className="block text-sm font-bold text-primary">
                TOL Barbershop
              </span>
              <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Legal center
              </span>
            </span>
          </Link>
        </div>
      </header>

      {children}

      <footer className="mt-auto border-t border-white/10 bg-primary px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 text-sm sm:grid-cols-2 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="font-semibold">TOL Barbershop</p>
            <p className="mt-2 max-w-xl leading-6 text-white/65">
              2nd Floor, Osrem Building, Gen. Trias Drive, Tejero, General
              Trias City, Cavite, Philippines
            </p>
            <Link
              href="mailto:ofcl.tolbarbershop@gmail.com"
              className="mt-2 inline-block text-white/80 underline decoration-accent underline-offset-4 hover:text-white"
            >
              ofcl.tolbarbershop@gmail.com
            </Link>
          </div>
          <nav
            aria-label="Footer legal documents"
            className=" space-x-4 self-start text-xs text-white/65 sm:text-sm"
          >
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                className="hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
