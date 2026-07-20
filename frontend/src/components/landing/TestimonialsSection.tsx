"use client";

import { Star } from "lucide-react";
import { useEffect, useState } from "react";

import { SectionHeading } from "./SectionHeading";
import { FadeIn } from "@/components/common/FadeIn";
import { cn } from "@/lib/utils";
import {
  getFeaturedFeedback,
  getLandingFeedback,
  type LandingFeedback,
} from "@/services/shared/landing.api";

export function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<LandingFeedback[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying || testimonials.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, testimonials.length]);

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
    <section
      id="testimonial"
      className="border-t border-white/5 bg-primary px-4 py-16 text-center text-white sm:px-8 sm:py-20 lg:px-12 lg:py-24"
    >
      <div className="mx-auto w-full max-w-7xl">
        <FadeIn>
          <SectionHeading
            eyebrow="Client stories"
            title="What Our Customers Say"
            description="Real experiences from clients who trust TOL Barbershop with their look."
          />
        </FadeIn>

        <FadeIn delay={150}>
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
        </FadeIn>
      </div>
    </section>
  );
}
