"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { SectionHeading } from "./SectionHeading";
import { FadeIn } from "@/components/common/FadeIn";
import {
  galleryCategories,
  galleryCategoryLabels,
  type GalleryCategory,
} from "@/lib/gallery";
import { cn } from "@/lib/utils";
import {
  getLandingGalleryImages,
  type LandingGalleryImage,
} from "@/services/shared/landing.api";

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

export function GallerySection() {
  const [activeCategory, setActiveCategory] =
    useState<GalleryCategory>("interior");
  const [galleryImages, setGalleryImages] = useState<LandingGalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);

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

  const managedCategoryImages = galleryImages
    .filter((image) => image.category === activeCategory)
    .map((image) => ({
      src: image.image_url,
      alt: image.alt_text,
    }));
  const activeGalleryImages =
    managedCategoryImages.length > 0
      ? managedCategoryImages
      : fallbackGalleryImages[activeCategory];

  return (
    <section
      id="gallery"
      className="border-t border-white/5 bg-primary px-4 py-16 text-white sm:px-8 sm:py-20 lg:px-12 lg:py-24"
    >
      <div className="mx-auto w-full max-w-7xl">
        <FadeIn>
          <SectionHeading
            eyebrow="Inside TOL"
            title="Our Gallery"
            description="A closer look at our crafts and space behind every fresh cut."
          />
        </FadeIn>

        <FadeIn delay={100}>
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
        </FadeIn>

        <div className="mt-10 grid w-full grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {galleryLoading && activeGalleryImages.length === 0 ? (
            <div className="aspect-[4/3] animate-pulse rounded-xl border border-white/10 bg-white/[0.06] sm:col-span-2 lg:col-span-3" />
          ) : activeGalleryImages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-5 py-12 text-center text-sm text-white/60 sm:col-span-2 lg:col-span-3">
              No images are available for this category yet.
            </div>
          ) : (
            activeGalleryImages.map((image, index) => (
              <FadeIn key={image.src} delay={index * 80}>
                <div className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10 shadow-xl shadow-black/15">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent opacity-60 transition-opacity group-hover:opacity-30" />
                </div>
              </FadeIn>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
