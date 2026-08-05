"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { getCloudinaryImageUrl, isCloudinaryImageUrl } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";

const HERO_IMAGE_URL =
  getCloudinaryImageUrl(
    "https://res.cloudinary.com/lgyelfkv/image/upload/TOL-Hero_mpjd3d",
    1920,
  );
const HERO_IMAGE_FALLBACK = "/TOL-Hero.png";

export function HeroSection() {
  const [heroImageSrc, setHeroImageSrc] = useState(HERO_IMAGE_URL);

  return (
    <section
      id="home"
      className="relative min-h-[100svh] w-full overflow-hidden"
    >
      <Image
        src={heroImageSrc}
        alt="Barber shop"
        fill
        sizes="100vw"
        className="object-cover object-center"
        priority
        unoptimized={isCloudinaryImageUrl(heroImageSrc)}
        onError={() => {
          if (heroImageSrc !== HERO_IMAGE_FALLBACK) {
            setHeroImageSrc(HERO_IMAGE_FALLBACK);
          }
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/10 via-black/15 to-black/75 px-4 pb-10 pt-28 mt-15 text-center sm:px-8 sm:pb-12 sm:pt-32">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-balance text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            <span
              className={cn(
                "block text-white/90 drop-shadow-[0_5px_14px_rgba(0,0,0,0.8)]",
                "animate-auth-card"
              )}
            >
              Straight to the chair.
            </span>
            <span
              className={cn(
                "mt-2 block text-accent drop-shadow-[0_5px_14px_rgba(0,0,0,0.85)] sm:mt-2",
                "animate-auth-card"
              )}
              style={{ animationDelay: "150ms" }}
            >
              Straight to your best look.
            </span>
          </h1>
          <p
            className="mb-6 mt-5 text-base text-white/80 drop-shadow-[0_3px_7px_rgba(0,0,0,0.8)] sm:text-lg animate-auth-card"
            style={{ animationDelay: "300ms" }}
          >
            Where classic meets modern style
          </p>
          <Link
            href="/login"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent/70 px-7 py-3 text-base font-semibold text-accent-foreground shadow-[0_10px_28px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-1 hover:bg-accent/90 hover:shadow-[0_14px_34px_rgba(0,0,0,0.45)] active:translate-y-0 sm:px-8 animate-auth-card"
            style={{ animationDelay: "450ms" }}
          >
            Schedule Your Appointment
          </Link>
        </div>
      </div>
    </section>
  );
}
