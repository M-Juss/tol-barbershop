"use client";

import {
  Clock3,
  Mail,
  MapPin,
  Menu,
  Navigation,
  Scissors,
  Star,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { RedirectIfAuthenticated } from "@/components/common/RedirectIfAuthenticated";
import {
  galleryCategories,
  galleryCategoryLabels,
  type GalleryCategory,
} from "@/lib/gallery";
import { sanitizeString } from "@/lib/sanitizer";
import { cn } from "@/lib/utils";
import {
  getFeaturedFeedback,
  getLandingGalleryImages,
  getLandingFeedback,
  getLandingServices,
  type LandingFeedback,
  type LandingGalleryImage,
  type LandingService,
} from "@/services/shared/landing.api";

const navLinks = [
  { name: "Home", href: "#home" },
  { name: "Services", href: "#services" },
  // { name: "About", href: "#about" },
  { name: "Gallery", href: "#gallery" },
  { name: "Testimonials", href: "#testimonial" },
  { name: "Contact", href: "#contact" },
];

const HERO_IMAGE_URL =
  "https://res.cloudinary.com/lgyelfkv/image/upload/TOL-Hero_mpjd3d";
const HERO_IMAGE_FALLBACK = "/TOL-Hero.png";
const SERVICES_IMAGE_URL =
  "https://res.cloudinary.com/lgyelfkv/image/upload/tol-barbershop/landing-gallery/axui0kjzyjs9rgc2nyxj";
const SERVICES_IMAGE_FALLBACK = "/InteriorImage/Interior1.jpg";
const VISIT_IMAGE_URL =
  "https://res.cloudinary.com/lgyelfkv/image/upload/Outdoor_vbhkhp";
const VISIT_IMAGE_FALLBACK = "/Outdoor.jpeg";

const fallbackGalleryImages: Record<
  GalleryCategory,
  Array<{ src: string; alt: string }>
> = {
  services: [],
  interior: [
    { src: "/InteriorImage/Interior1.jpg", alt: "TOL Barbershop interior" },
    { src: "/InteriorImage/Interior2.jpg", alt: "TOL Barbershop interior" },
    { src: "/InteriorImage/Interior3.jpg", alt: "TOL Barbershop interior" },
  ],
  tools: [
    { src: "/ToolsImage/Tools1.jpg", alt: "TOL Barbershop tools" },
    { src: "/ToolsImage/Tools2.jpg", alt: "TOL Barbershop tools" },
    { src: "/ToolsImage/Tools3.jpg", alt: "TOL Barbershop tools" },
  ],
};

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
};

function SectionHeading({
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

export default function Home() {
  return (
    <RedirectIfAuthenticated>
      <HomeContent />
    </RedirectIfAuthenticated>
  );
}

function HomeContent() {
  const [activeCategory, setActiveCategory] =
    useState<GalleryCategory>("interior");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [services, setServices] = useState<LandingService[]>([]);
  const [galleryImages, setGalleryImages] = useState<LandingGalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [testimonials, setTestimonials] = useState<LandingFeedback[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [heroImageSrc, setHeroImageSrc] = useState(HERO_IMAGE_URL);
  const [servicesImageSrc, setServicesImageSrc] = useState(SERVICES_IMAGE_URL);
  const [visitImageSrc, setVisitImageSrc] = useState(VISIT_IMAGE_URL);
  const managedCategoryImages = galleryImages
    .filter((image) => image.category === activeCategory)
    .map((image) => ({
      src: image.image_url,
      alt: sanitizeString(image.alt_text),
    }));
  const activeGalleryImages =
    managedCategoryImages.length > 0
      ? managedCategoryImages
      : fallbackGalleryImages[activeCategory];

  useEffect(() => {
    if (!isAutoPlaying || testimonials.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, testimonials.length]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await getLandingServices();
        setServices(data);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error("Failed to load services:", message);
      }
    };

    fetchServices();
  }, []);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const data = await getFeaturedFeedback();
        if (data.length > 0) {
          setTestimonials(data);
          return;
        }
      } catch {}

      try {
        const data = await getLandingFeedback();
        setTestimonials(data);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error("Failed to load feedback:", message);
      }
    };

    fetchFeedback();
  }, []);

  useEffect(() => {
    const fetchGalleryImages = async () => {
      try {
        setGalleryImages(await getLandingGalleryImages());
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error("Failed to load gallery images:", message);
      } finally {
        setGalleryLoading(false);
      }
    };

    fetchGalleryImages();
  }, []);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  const safeCurrentIndex =
    testimonials.length > 0
      ? Math.min(currentIndex, testimonials.length - 1)
      : 0;
  const currentTestimonial = testimonials[safeCurrentIndex] ?? null;

  return (
    <div className="w-full">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-black/35 px-4 py-3 text-sm shadow-lg shadow-black/15 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
          <div className="flex items-center space-x-2">
            <Image
              src="/Tol-Logo-White-Bg.png"
              alt="TOL Barbershop logo"
              height={38}
              width={38}
              className="rounded-lg shadow-md shadow-black/20"
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

      <main>
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
            onError={() => {
              if (heroImageSrc !== HERO_IMAGE_FALLBACK) {
                setHeroImageSrc(HERO_IMAGE_FALLBACK);
              }
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/10 via-black/15 to-black/75 px-4 pb-10 pt-28 mt-15 text-center sm:px-8 sm:pb-12 sm:pt-32">
            <div className="mx-auto max-w-5xl">
              <h1 className="text-balance text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                <span className="block  text-white/90 drop-shadow-[0_5px_14px_rgba(0,0,0,0.8)]">
                  Straight to the chair.
                </span>
                <span className="mt-2 block text-accent drop-shadow-[0_5px_14px_rgba(0,0,0,0.85)] sm:mt-2">
                  Straight to your best look.
                </span>
              </h1>
              <p className="mb-6 mt-5 text-base text-white/80 drop-shadow-[0_3px_7px_rgba(0,0,0,0.8)] sm:text-lg">
                Where classic meets modern style
              </p>
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent/70 px-7 py-3 text-base font-semibold text-accent-foreground shadow-[0_10px_28px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-1 hover:bg-accent/90 hover:shadow-[0_14px_34px_rgba(0,0,0,0.45)] active:translate-y-0 sm:px-8"
              >
                Schedule Your Appointment
              </Link>
            </div>
          </div>
        </section>

        <section
          id="services"
          className="border-t border-white/5 bg-primary px-4 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24"
        >
          <div className="mx-auto w-full max-w-7xl">
            <SectionHeading
              eyebrow="Precision in every cut"
              title="Our Services"
              description="Thoughtful grooming, sharp details, and dependable results in every appointment."
            />

            <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-14">
              <div className="space-y-5">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="rounded-xl border border-white/10 bg-white/[0.035] p-5 text-white shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-1 hover:border-accent/35 hover:shadow-xl hover:shadow-black/20 sm:p-6"
                  >
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <h3 className="text-lg font-semibold drop-shadow-sm sm:text-xl">
                        {service.name}
                      </h3>
                      <p className="shrink-0 text-xl font-semibold text-accent drop-shadow-sm sm:text-2xl">
                        {service.price ? `P${service.price}` : "N/A"}
                      </p>
                    </div>
                    <p className="mb-2 text-sm leading-6 text-white/60 sm:text-base">
                      {service.description || "No description available."}
                    </p>
                    <p className="text-sm text-white/50">
                      {service.duration ? `${service.duration} min` : "N/A"}
                    </p>
                  </div>
                ))}
              </div>

              <div className="relative min-h-80 overflow-hidden rounded-xl border border-white/10 shadow-2xl shadow-black/20 sm:min-h-[28rem] lg:min-h-full">
                <Image
                  src={servicesImageSrc}
                  alt="Interior of TOL Barbershop"
                  fill
                  className="object-cover transition-transform duration-700 hover:scale-[1.03]"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  onError={() => {
                    if (servicesImageSrc !== SERVICES_IMAGE_FALLBACK) {
                      setServicesImageSrc(SERVICES_IMAGE_FALLBACK);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <section
          id="gallery"
          className="border-t border-white/5 bg-primary px-4 py-16 text-white sm:px-8 sm:py-20 lg:px-12 lg:py-24"
        >
          <div className="mx-auto w-full max-w-7xl">
            <SectionHeading
              eyebrow="Inside TOL"
              title="Our Gallery"
              description="A closer look at our crafts and space behind every fresh cut."
            />

            <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-center sm:gap-4">
              {galleryCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  aria-pressed={activeCategory === category}
                  className={cn(
                    "min-h-11 w-full rounded-full border px-2 py-2 text-xs font-medium shadow-md transition-all duration-300 hover:-translate-y-0.5 sm:w-auto sm:px-6 sm:text-sm",
                    activeCategory === category
                      ? "border-accent bg-accent text-accent-foreground shadow-accent/15"
                      : "border-white/10 bg-white/[0.03] text-white hover:border-white/25 hover:bg-white/[0.07]",
                  )}
                >
                  {galleryCategoryLabels[category]}
                </button>
              ))}
            </div>

            <div className="mt-10 grid w-full grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {galleryLoading && activeGalleryImages.length === 0 ? (
                <div className="aspect-[4/3] animate-pulse rounded-xl border border-white/10 bg-white/[0.06] sm:col-span-2 lg:col-span-3" />
              ) : activeGalleryImages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-5 py-12 text-center text-sm text-white/60 sm:col-span-2 lg:col-span-3">
                  No images are available for this category yet.
                </div>
              ) : (
                activeGalleryImages.map((image) => (
                  <div
                    key={image.src}
                    className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10 shadow-xl shadow-black/15"
                  >
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent opacity-60 transition-opacity group-hover:opacity-30" />
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section
          id="testimonial"
          className="border-t border-white/5 bg-primary px-4 py-16 text-center text-white sm:px-8 sm:py-20 lg:px-12 lg:py-24"
        >
          <div className="mx-auto w-full max-w-7xl">
            <SectionHeading
              eyebrow="Client stories"
              title="What Our Customers Say"
              description="Real experiences from clients who trust TOL Barbershop with their look."
            />

            <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-8 shadow-2xl shadow-black/20 sm:px-8 sm:py-12 lg:px-12">
              {currentTestimonial ? (
                <>
                  <div className="mb-8 flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-6 w-6 drop-shadow-sm sm:h-7 sm:w-7",
                          i < currentTestimonial.rating
                            ? "fill-accent text-accent"
                            : "text-white/30",
                        )}
                      />
                    ))}
                  </div>

                  <p className="mb-8 text-pretty text-lg leading-8 text-white/90 drop-shadow-[0_2px_5px_rgba(0,0,0,0.35)] sm:text-xl lg:text-2xl">
                    &quot;{currentTestimonial.comment}&quot;
                  </p>

                  <div className="mb-1 flex items-center space-x-3">
                    <p className="flex h-12 w-12 items-center justify-center rounded-full bg-accent font-bold shadow-lg shadow-accent/15">
                      {currentTestimonial.customer_initials || "C"}
                    </p>
                    <div className="text-left">
                      <p className="font-medium">
                        {currentTestimonial.customer_name}
                      </p>
                      <p className="text-xs text-white/50">
                        {currentTestimonial.service_name ??
                          "TOL Barbershop Customer"}
                      </p>
                    </div>
                  </div>

                  {testimonials.length > 1 ? (
                    <div className="mt-8 flex justify-between space-x-3">
                      {testimonials.map((item, index) => (
                        <button
                          key={item.id}
                          onClick={() => goToSlide(index)}
                          className={cn(
                            "h-3 w-3 rounded-full transition-all duration-300",
                            safeCurrentIndex === index
                              ? "w-10 bg-accent"
                              : "bg-white/70 hover:bg-white",
                          )}
                          aria-label={`Show feedback ${index + 1}`}
                        ></button>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="py-8 text-white/55">
                  Customer feedback will appear here after completed bookings.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-t border-white/5 bg-primary px-4 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="pointer-events-none absolute -left-32 top-1/3 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-white/5 blur-3xl" />

          <div className="relative mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Find your way"
              title="Come and Visit Us"
              description="Drop by for a fresh cut or just to say hello. Our chair is ready when you are."
            />

            <div className="grid overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/20 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="group relative min-h-80 overflow-hidden sm:min-h-96 lg:min-h-[38rem]">
                <Image
                  src={visitImageSrc}
                  alt="TOL Barbershop storefront sign"
                  fill
                  className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]"
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  onError={() => {
                    if (visitImageSrc !== VISIT_IMAGE_FALLBACK) {
                      setVisitImageSrc(VISIT_IMAGE_FALLBACK);
                    }
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                  <div className="inline-flex items-center gap-3 rounded-xl border border-white/15 bg-primary/85 px-4 py-3 text-white shadow-lg backdrop-blur-md">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent">
                      <Scissors className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">
                        TOL Barbershop
                      </span>
                      <span className="block text-xs text-white/60">
                        Tejero, General Trias
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex min-w-0 flex-col">
                <iframe
                  title="TOL Barbershop location on Google Maps"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3864.537221528138!2d120.8606439750669!3d14.396166386066287!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33962da0b18f65cf%3A0xc3b88fcbdf399c9!2sTol%20Barbershop!5e0!3m2!1sen!2sph!4v1783435390818!5m2!1sen!2sph"
                  className="h-72 w-full sm:h-80 lg:h-[22rem]"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />

                <div className="grid flex-1 gap-6 p-5 sm:grid-cols-2 sm:p-7 lg:p-8">
                  <div className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                      <MapPin className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-white">Our location</h3>
                      <p className="mt-2 text-sm leading-6 text-white/60">
                        2nd Floor, Osrem Building, Gen. Trias Drive, Tejero,
                        General Trias City, Cavite
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                      <Clock3 className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-white">Opening hours</h3>
                      <p className="mt-2 text-sm leading-6 text-white/60">
                        Monday - Saturday
                        <br />
                        9:00 AM - 7:00 PM
                      </p>
                    </div>
                  </div>

                  <a
                    href="https://www.google.com/maps/search/?api=1&query=TOL+Barbershop+General+Trias+Cavite"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 sm:col-span-2 sm:justify-self-start"
                  >
                    <Navigation className="h-4 w-4" aria-hidden="true" />
                    Get Directions
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer
        id="contact"
        className="flex flex-col border-y border-white/10 bg-primary text-white "
      >
        <div className="grid md:grid-cols-3 grid-cols-1 px-6 sm:px-8 lg:px-10 xl:px-32 py-12 gap-8 sm:gap-12">
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-5 ">
              <Image
                src="/Tol-Logo-White-Bg.png"
                alt="Logo"
                height={35}
                width={35}
                className="rounded-lg"
              />
              <p className="text-xl font-semibold ">TOL Barbershop</p>
            </div>
            <p className="text-sm">
              Where traditional barbering meets modern style. May barbero kana, may Ka-TOL ka pa!
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href="https://www.facebook.com/profile.php?id=61550652631553"
                target="_blank"
                rel="noreferrer"
                aria-label="TOL Barbershop on Facebook"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white hover:border-accent hover:text-accent transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M22 12.06C22 6.48 17.52 2 11.94 2S2 6.48 2 12.06c0 5.02 3.66 9.19 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.23.2 2.23.2v2.46h-1.25c-1.24 0-1.62.77-1.62 1.56v1.89h2.76l-.44 2.91h-2.32V22C18.34 21.25 22 17.08 22 12.06Z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/tolbarbershop/?hl=en"
                target="_blank"
                rel="noreferrer"
                aria-label="TOL Barbershop on Instagram"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white hover:border-accent hover:text-accent transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <rect width="18" height="18" x="3" y="3" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle
                    cx="17.5"
                    cy="6.5"
                    r="1"
                    fill="currentColor"
                    stroke="none"
                  />
                </svg>
              </a>
            </div>
          </div>

          <div className="flex flex-col space-y-5 ">
            <p className="text-xl font-semibold mb-5">Contact Us</p>
            <div className="flex items-center space-x-3">
              <Mail />
              <a
                href="mailto:tolbarbershop23@gmail.com"
                className="text-sm hover:text-accent transition-colors"
              >
                tolbarbershop23@gmail.com
              </a>
            </div>

            <div className="flex items-start space-x-3">
              <MapPin size={50} />
              <p className="text-sm">
                2nd floor, Osrem Building, Gen Trias Drive, Tejero, Gen Trias
                City, Cavite (in front of Petron crossing)
              </p>
            </div>
          </div>

          <div className="flex flex-col">
            <p className="text-xl font-semibold mb-5">Opening Hours</p>

            <div className="flex  pb-4 justify-between items-center">
              <p className="text-sm">Monday - Saturday </p>
              <p className="text-sm">9:00 AM - 7:00 PM</p>
            </div>

            <div className="flex border-t border-white/10 pb-4 justify-between items-center">
              <p className="text-sm pt-4">Sunday</p>
              <p className="text-sm pt-4">Closed</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-6 sm:px-8 py-4 border-t border-white/10 bg-black/10 text-center">
          <p className="text-sm text-neutral">
            &copy; 2026 TOL Barbershop. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1 sm:text-sm text-xs">
            <Link href="/privacy-policy" className="text-neutral hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/terms-of-use" className="text-neutral hover:text-white">
              Terms of Use
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
