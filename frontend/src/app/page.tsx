import { RedirectIfAuthenticated } from "@/components/common/RedirectIfAuthenticated";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { ServicesSection } from "@/components/landing/ServicesSection";
import { GallerySection } from "@/components/landing/GallerySection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { VisitSection } from "@/components/landing/VisitSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Home() {
  return (
    <RedirectIfAuthenticated>
      <LandingHeader />
      <main>
        <HeroSection />
        <ServicesSection />
        <GallerySection />
        <TestimonialsSection />
        <VisitSection />
      </main>
      <LandingFooter />
    </RedirectIfAuthenticated>
  );
}
