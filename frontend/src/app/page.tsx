"use client";
import { cn } from "@/lib/utils";
import { Mail, MapPin, Phone, Scissors, Star, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getFeaturedFeedback,
  getLandingFeedback,
  getLandingServices,
  type LandingFeedback,
  type LandingService,
} from "@/services/shared/landing.api";
import { RedirectIfAuthenticated } from "@/components/common/RedirectIfAuthenticated";

const navLinks = [
  { name: "Home", href: "#home" },
  { name: "Services", href: "#services" },
  { name: "About", href: "#about" },
  { name: "Gallery", href: "#gallery" },
  { name: "Testimonials", href: "#testimonial" },
  { name: "Contact", href: "#contact" },
];

const cardAbout = [
  { h1: "15+", p: "Years of Experience" },
  { h1: "5K+", p: "Happy Customer" },
  { h1: "5", p: "Expert Barbers" },
  { h1: "100%", p: "Satisfaction" },
];

const galleryCards = [
  {
    image: "/GalleryImage/InteriorGalleryImage.jpg",
    category: "Interior",
    description: "Classic  Ambiance",
  },
  {
    image: "/GalleryImage/Tools2GalleryImage.jpg",
    category: "Tools",
    description: "Professional Barber Tools",
  },
  {
    image: "/GalleryImage/ProductGalleryImage.jpg",
    category: "Products",
    description: "Premium Grooming Products",
  },
  {
    image: "/GalleryImage/ProductsGalleryImage.jpg",
    category: "Products",
    description: "Premium Grooming Products",
  },
  {
    image: "/GalleryImage/ToolsGalleryImage.jpg",
    category: "Tools",
    description: "Professional Barber Tools",
  },
  {
    image: "/GalleryImage/ServiceGalleryImage.jpg",
    category: "Services",
    description: "Expert Haircut in Progress",
  },
];

export default function Home() {
  return (
    <RedirectIfAuthenticated>
      <HomeContent />
    </RedirectIfAuthenticated>
  );
}

function HomeContent() {
  const categories = ["All", "Interior", "Products", "Tools", "Services"];

  const [activeCategory, setActiveCategory] = useState("All");

  const filteredGallery =
    activeCategory === "All"
      ? galleryCards
      : galleryCards.filter((image) => image.category === activeCategory);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [services, setServices] = useState<LandingService[]>([]);
  const [testimonials, setTestimonials] = useState<LandingFeedback[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      } catch {
      }

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
    <div className="w-full">
      <header className="fixed z-10 w-full top-0 flex items-center text-sm justify-between px-6 sm:px-6 py-3 bg-accent/70 backdrop-blur">
        <div className="flex space-x-2 items-center">
          <Image
            src="/Tol-Logo-White-Bg.png"
            alt="Logo"
            height={40}
            width={40}
            className="rounded-lg"
          />
          <h1 className="font-bold text-primary-foreground text-md">
            Tol Barbershop
          </h1>
        </div>

        <nav className="hidden md:flex items-center md:gap-4 lg:gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-white hover:text-primary-foreground transition-colors duration-300 relative group"
            >
              {link.name}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary-foreground group-hover:w-full opacity-0 group-hover:opacity-100 transition-all duration-300"></span>
            </a>
          ))}
        </nav>

        <Link
          href="/login"
          className="hidden md:inline-block bg-primary hover:bg-primary/90 text-white py-2 px-6 rounded-md"
        >
          Login
        </Link>

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="md:hidden p-2 text-white"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="absolute top-0 right-0 h-full w-64 bg-primary flex flex-col p-6 shadow-xl">
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
                  className="text-white hover:text-primary/90 transition-colors text-lg"
                >
                  {link.name}
                </a>
              ))}
            </nav>
            <div className="mt-auto space-y-3">
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block w-full text-center bg-primary hover:bg-primary/90 text-white py-2.5 px-4 rounded-md border border-white/20"
              >
                Login
              </Link>
              <Link
                href="/register"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block w-full text-center bg-accent hover:bg-accent/90 text-accent-foreground py-2.5 px-4 rounded-md"
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      )}

      <main>
        <section
          id="home"
          className="relative min-h-screen w-full overflow-hidden"
        >
          <Image
            src="/Tol-Hero-Image.png"
            alt="Barber shop"
            fill
            sizes="100vw"
            className="absolute inset-0 w-full h-full object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-center px-6 sm:px-6">
            <div>
              <h1 className="text-5xl sm:text-6xl lg:text-6xl font-extrabold text-white mb-1 sm:mb-2 leading-tight">
                WHERE STYLE
              </h1>
              <h1 className="text-5xl sm:text-6xl lg:text-6xl font-extrabold text-accent mb-2 sm:mb-2 leading-tight">
                MEETS PRECISION
              </h1>
              <p className="text-white/80 mb-4 text-base sm:text-lg lg:text-lg">
                Where classic meets modern style
              </p>
              <Link
                href="/login"
                className="bg-accent/80 text-accent-foreground md:px-6 md:text-sm md:py-2 px-7 py-3 rounded-xl inline-block text-base sm:text-lg font-semibold"
              >
                Book Appointment
              </Link>
            </div>
          </div>
        </section>

        <section
          id="services"
          className="py-16 sm:py-24 px-6 sm:px-8 lg:px-20 xl:px-32 bg-primary flex flex-col items-center"
        >
          <div className="flex items-center gap-4 ">
            <div className="h-1 w-20 bg-accent rounded-sm"></div>
            <p className="text-accent">
              <Scissors size={40} className="text-accent" />
            </p>
            <div className="h-1 w-20 bg-accent rounded-sm"></div>
          </div>
          <h1 className="text-primary-foreground text-3xl sm:text-4xl lg:text-5xl font-semibold mb-4 ">
            Our Services
          </h1>
          <h3 className="text-gray-400 mb-12">
            Crafted with precision, delivered with excellence
          </h3>

          <div className="grid lg:grid-cols-2 grid-cols-1 gap-8 lg:gap-14 w-full">
            <div className="flex-col space-y-5">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex-col px-6 py-8 justify-between items-center  border border-white/10 p-6 text-white shadow-lg rounded-lg hover:scale-105 transition duration-300"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-semibold">{service.name}</h2>
                    <p className="text-accent font-semibold text-2xl">
                      {service.price ? `P${service.price}` : "N/A"}
                    </p>
                  </div>
                  <p className="text-gray-400 text-md mb-2">
                    {service.description || "No description available."}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {service.duration ? `${service.duration} min` : "N/A"}
                  </p>
                </div>
              ))}
            </div>

            <Image
              src="/ServiceImage.jpg"
              alt="Service Image"
              width={700}
              height={900}
              className="object-cover w-full h-full rounded-md hover:scale-105 transition duration-300"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </section>

        <section
          id="about"
          className="px-6 sm:px-8 lg:px-20 xl:px-44 py-16 sm:py-20 bg-primary/95 grid lg:grid-cols-2 grid-cols-1 gap-8 lg:gap-12 w-full text-white"
        >
          <div className="my-auto">
            <Image
              src="/AboutImage.jpg"
              alt="About Image"
              width={500}
              height={600}
              className="object-cover h-full rounded-xl hover:scale-105 transition duration-300"
            />
          </div>

          <div className="flex flex-col space-y-6">
            <p className="text-accent">ABOUT US</p>

            <p className="text-3xl sm:text-4xl font-semibold">
              Crafting Confidence Through Classic Grooming
            </p>

            <p className="text-gray-400">
              Since 2009, Tol Barbershop has been the cornestone of
              gentleman&apos;s grooming in the city. Our master barbers combine
              time-honord techniques with contemporary styles to deliver an
              unparalleled experience.
            </p>

            <p className="text-gray-400">
              We believe every man deserves to look and feel his best.
              That&apos;s why we use only premium products and tools, ensuring
              each cut isa masterpiece and every shave is an indulgece.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-7">
              {cardAbout.map((about, index) => (
                <div
                  key={index}
                  className="flex flex-col border border-white/10 p-6 space-y-2 rounded-md hover:scale-105 transition duration-300"
                >
                  <p className="text-accent text-2xl">{about.h1}</p>
                  <p className="text-xs">{about.p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="gallery"
          className="px-6 sm:px-8 lg:px-20 xl:px-44 py-16 sm:py-20 flex flex-col items-center text-white bg-primary"
        >
          <p className="mb-2 text-3xl sm:text-4xl lg:text-5xl font-semibold text-center">
            Our Gallery
          </p>
          <p className="mb-8 text-gray-400 text-center">
            A glimpse into our world of classic grooming and modern
          </p>

          <div className="flex w-full justify-center gap-4 flex-wrap">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={cn(
                  "px-6 py-2 border border-white/10 rounded-full transition-all duration-300 transform hover:scale-105",
                  activeCategory === category ? "bg-accent" : "",
                )}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10 w-full">
            {filteredGallery.map((card, index) => (
              <div
                key={index}
                className="group relative hover:scale-105  duration-300 rounded-md border border-white/10"
              >
                <Image
                  src={card.image}
                  alt={card.description}
                  width={400}
                  height={256}
                  className="w-full h-64 object-cover rounded-lg"
                />
                <span className="absolute top-44 left-5 bg-accent text-sm px-2 py-1 rounded-xl">
                  {card.category}
                </span>
                <p className="absolute bottom-0 left-0 px-5 py-3 bg-black/70 w-full text-white rounded-md">
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="testimonial"
          className="px-6 sm:px-8 lg:px-20 xl:px-44 py-16 sm:py-20 flex flex-col items-center bg-primary/95 text-center text-white"
        >
          <p className="md:text-5xl sm:text-4xl text-3xl font-semibold mb-4 ">
            What Our Customer Say
          </p>
          <p className="text-sm text-gray-400 mb-8">
            Don&apos;t just take our word for it - hear from our satisfied
            clients
          </p>

          <div className="px-5 sm:px-8 lg:px-12 py-8 sm:py-12 border border-white/12 relative flex flex-col items-center rounded-xl hover:scale-105 transition duration-300">
            {currentTestimonial ? (
              <>
                <div className="flex gap-1 mb-8">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={50}
                      className={cn(
                        "w-7 h-7",
                        i < currentTestimonial.rating
                          ? "text-accent fill-accent"
                          : "text-gray-400",
                      )}
                    />
                  ))}
                </div>

                <p className="text-lg sm:text-xl lg:text-2xl mb-8">
                  &quot;{currentTestimonial.comment}&quot;
                </p>

                <div className="flex items-center space-x-3 mb-1">
                  <p className="px-4 py-3 bg-accent rounded-full font-bold">
                    {currentTestimonial.customer_initials || "C"}
                  </p>
                  <div className="text-left">
                    <p>{currentTestimonial.customer_name}</p>
                    <p className="text-xs text-gray-400">
                      {currentTestimonial.service_name ??
                        "Tol Barbershop Customer"}
                    </p>
                  </div>
                </div>

                {testimonials.length > 1 ? (
                  <div className="flex justify-between space-x-3 mt-8">
                    {testimonials.map((item, index) => (
                      <button
                        key={item.id}
                        onClick={() => goToSlide(index)}
                        className={cn(
                          "w-3 h-3 transition-all duration-300 rounded-full",
                          safeCurrentIndex === index
                            ? "w-10 bg-accent"
                            : "bg-white",
                        )}
                        aria-label={`Show feedback ${index + 1}`}
                      ></button>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="py-8 text-gray-400">
                Customer feedback will appear here after completed bookings.
              </div>
            )}
          </div>
        </section>

        <section className="px-6 sm:px-8 lg:px-20 xl:px-44 py-16 sm:py-20 flex flex-col items-center bg-primary">
          <p className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-center text-white mb-4">
            Come and Visit Us
          </p>
          
          <p className="text-sm text-gray-400 mb-8 text-center">
            Drop by for a haircut or just to say hello. We&apos;d love to
            welcome you!
          </p>

          <div className="w-full rounded-xl overflow-hidden shadow-lg">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3864.537221528138!2d120.8606439750669!3d14.396166386066287!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33962da0b18f65cf%3A0xc3b88fcbdf399c9!2sTol%20Barbershop!5e0!3m2!1sen!2sph!4v1783435390818!5m2!1sen!2sph"
              className="w-full h-72 sm:h-96"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
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
                height={50}
                width={50}
                className="rounded-lg"
              />
              <p className="text-xl">Tol Barbershop</p>
            </div>
            <p className="text-sm">
              Where traditional barbering meets modern style. Experience the
              finest in gentleman&apos;s grooming since 2009.
            </p>
          </div>

          <div className="flex flex-col space-y-5 ">
            <p className="text-xl mb-5">Contact Us</p>
            <div className="flex items-center space-x-3">
              <MapPin />
              <p className="text-sm">
                123 Main Street, Downtown New York, NY 10001
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Phone />
              <p className="text-sm">(555) 123-4567</p>
            </div>

            <div className="flex items-center space-x-3">
              <Mail />
              <p className="text-sm">info@tolbarbershop.com</p>
            </div>
          </div>

          <div className="flex flex-col">
            <p className="text-xl mb-5">Opening Hours</p>

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
            &copy; 2024 Tol Barbershop. All rights reserved.
          </p>
          <div className="flex justify-center items-center space-x-3 sm:text-sm  text-xs">
            <a href="#" className=" text-neutral">
              Privacy Policy
            </a>
            <a href="#" className=" text-neutral">
              Terms of Service
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
