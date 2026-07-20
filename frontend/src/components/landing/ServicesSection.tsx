"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { SectionHeading } from "./SectionHeading";
import { FadeIn } from "@/components/common/FadeIn";
import {
  getLandingServices,
  type LandingService,
} from "@/services/shared/landing.api";

const SERVICES_IMAGE_URL =
  "https://res.cloudinary.com/lgyelfkv/image/upload/tol-barbershop/landing-gallery/axui0kjzyjs9rgc2nyxj";
const SERVICES_IMAGE_FALLBACK = "/InteriorImage/Interior1.jpg";

export function ServicesSection() {
  const [services, setServices] = useState<LandingService[]>([]);
  const [servicesImageSrc, setServicesImageSrc] = useState(SERVICES_IMAGE_URL);

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

  return (
    <section
      id="services"
      className="border-t border-white/5 bg-primary px-4 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24"
    >
      <div className="mx-auto w-full max-w-7xl">
        <FadeIn>
          <SectionHeading
            eyebrow="Precision in every cut"
            title="Our Services"
            description="Thoughtful grooming, sharp details, and dependable results in every appointment."
          />
        </FadeIn>

        <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-14">
          <div className="space-y-5">
            {services.map((service, index) => (
              <FadeIn key={service.id} delay={index * 100}>
                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-5 text-white shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-1 hover:border-accent/35 hover:shadow-xl hover:shadow-black/20 sm:p-6">
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
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={200} className="relative min-h-80 overflow-hidden rounded-xl border border-white/10 shadow-2xl shadow-black/20 sm:min-h-[28rem] lg:min-h-full">
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
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
