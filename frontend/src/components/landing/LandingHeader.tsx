"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { name: "Home", href: "#home" },
  { name: "Services", href: "#services" },
  { name: "Gallery", href: "#gallery" },
  { name: "Testimonials", href: "#testimonial" },
  { name: "Contact", href: "#contact" },
];

export function LandingHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-black/35 px-4 py-3 text-sm shadow-lg shadow-black/15 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
          <div className="flex items-center space-x-2">
            <Image
              src="/tol-rounded-logo.png"
              alt="TOL Barbershop logo"
              height={38}
              width={38}
              className="rounded-3xl shadow-md shadow-black/20"
            />
            <p className="font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.55)]">
              TOL Barbershop
            </p>
          </div>

          <nav className="hidden items-center gap-5 lg:flex xl:gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="group relative text-white/85 drop-shadow-sm transition-colors duration-300 hover:text-white"
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-accent opacity-0 transition-all duration-300 group-hover:w-full group-hover:opacity-100" />
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/login"
              className="rounded-lg bg-white px-6 py-2.5 font-semibold text-black shadow-[0_8px_22px_rgba(0,0,0,0.24)] ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-primary hover:shadow-[0_12px_28px_rgba(0,0,0,0.3)] active:translate-y-0"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary px-5 py-2.5 font-semibold text-white shadow-[0_8px_22px_rgba(0,0,0,0.28)] ring-1 ring-white/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent/80 hover:text-white hover:shadow-[0_12px_28px_rgba(0,0,0,0.34)] active:translate-y-0"
            >
              Create Account
            </Link>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="rounded-lg p-2 text-white transition-colors hover:bg-white/10 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="absolute right-0 top-0 flex h-full w-[min(20rem,85vw)] flex-col bg-primary p-6 shadow-2xl shadow-black/40">
            <div className="flex justify-end mb-6">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-white"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex flex-col space-y-4 flex-1">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg text-white transition-colors hover:text-accent"
                >
                  {link.name}
                </a>
              ))}
            </nav>
            <div className="mt-auto space-y-3">
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block w-full rounded-lg bg-white px-4 py-2.5 text-center font-semibold text-primary shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
              >
                Login
              </Link>
              <Link
                href="/register"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block w-full rounded-lg bg-primary px-4 py-2.5 text-center font-semibold text-white shadow-lg shadow-black/25 ring-1 ring-white/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-primary hover:shadow-xl"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
