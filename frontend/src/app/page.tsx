"use client";
import { Clock, Mail, MapPin, Phone, Scissors, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const navLinks = [
  { name: "Home", href: "#home" },
  { name: "Services", href: "#services" },
  { name: "About", href: "#about" },
  { name: "Gallery", href: "#gallery" },
  { name: "Testimonials", href: "#testimonial" },
  { name: "Contact", href: "#contact" },
];

const cardServices = [
  {
    title: "Classic Haircuts",
    price: "P200",
    description: "Traditional scissor cut with styling and finishing",
    duration: "45 min",
  },
  {
    title: "Hot Towel Shave",
    price: "P450",
    description: "Luxurious straight razor shave with premium products",
    duration: "30 min",
  },
  {
    title: "Beard Trim & Shape",
    price: "P300",
    description: "Precision beard sculpting and conditioning treatment",
    duration: "30 min",
  },
  {
    title: "Full Service",
    price: "P700",
    description: "Complete grooming experience - cut, shave, and styling",
    duration: "90 min",
  },
];

const testimonials = [
  {
    name: "David Thompson",
    role: "Business Executive",
    rating: 5,
    text: '" Limang taon na akong bumabalik sa Tols Barbershop. Alam na agad ni Marcus kung anong style ang babagay sa akin. Iba talaga ang attention to detail at napaka-professional ng atmosphere dito. "',
    image: "DT",
  },
  {
    name: "Michael Chen",
    role: "Software Engineer",
    rating: 5,
    text: '" Pinakamagandang barbershop sa siyudad! Perpekto lagi ang fades ni Jake. Ang ganda ng kombinasyon ng modern vibe at classic na serbisyo—kaya dito na talaga ako palagi. "',
    image: "MC",
  },
  {
    name: "Robert Martinez",
    role: "Restaurant Owner",
    rating: 5,
    text: '" Sobrang nag-level up ang beard ko dahil kay Rico. Kitang-kita ang husay at attention to detail niya sa beard grooming. Highly recommended para sa mga seryoso sa kanilang style. "',
    image: "RM",
  },
  {
    name: "James Wilson",
    role: "Marketing Director",
    rating: 5,
    text: '" Legendary ang hot towel shave experience dito. Hindi lang ito simpleng gupit—kumpletong gentleman’s grooming experience talaga. Sulit na sulit bawat bayad. "',
    image: "JW",
  },
  {
    name: "Anthony Brown",
    role: "Photographer",
    rating: 5,
    text: '" Marami na akong napuntahang barbershop, pero iba talaga ang Tols Barbershop. Consistent ang quality, maayos ang serbisyo, at sobrang professional. Dito na ako forever. "',
    image: "AB",
  },
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
  const categories = ["All", "Interior", "Products", "Tools", "Services"];

  const [activeCategory, setActiveCategory] = useState("All");

  const filteredGallery =
    activeCategory === "All"
      ? galleryCards
      : galleryCards.filter((image) => image.category === activeCategory);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  return (
    <div className="min-h-screen">
      <header className="fixed z-10 w-full top-0 flex items-center text-sm justify-between px-4 sm:px-6 py-3 bg-accent/70 backdrop-blur">
        <div className="flex space-x-2 items-center">
          <Image src="/logo.svg" alt="Logo" height={40} width={40} />
          <h1 className="font-bold text-primary-foreground text-md">
            Tols Barbershop
          </h1>
        </div>

        <nav className="hidden md:flex items-center md:gap-4 lg:gap-8 text-white">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className=" hover:text-primary/90 transition-colors duration-300 relative group"
            >
              {link.name}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary/90 group-hover:w-full transition-all duration-300"></span>
            </a>
          ))}
        </nav>

        <Link
          href="/login"
          className="bg-primary hover:bg-primary/90 text-white py-2 px-4 rounded-md"
        >
          Login
        </Link>
      </header>

      <main>
        <section
          id="home"
          className="relative min-h-screen w-full overflow-hidden"
        >
          <Image
            src="/Tols.png"
            alt="Barber shop"
            fill
            sizes="100vw"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-center px-6">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-2 ">
                WHERE STYLE
              </h1>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-accent mb-4 ">
                MEETS PRECISION
              </h1>
              <p className="text-white/80 mb-6">
                Where classic meets modern style
              </p>
              <Link
                href="/login"
                className="bg-accent/80 text-accent-foreground px-4 sm:px-6 py-3 rounded-xl inline-block"
              >
                Book Appointment
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24 px-4 sm:px-10 lg:px-20 xl:px-32 bg-primary flex flex-col items-center">
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
              {cardServices.map((service, index) => (
                <div
                  key={index}
                  className="flex-col px-6 py-8 justify-between items-center  border border-white/10 p-6 text-white shadow-lg rounded-lg hover:scale-105 transition duration-300"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-semibold">{service.title}</h2>
                    <p className="text-accent font-semibold text-2xl">
                      {service.price}
                    </p>
                  </div>
                  <p className="text-neutral-landing text-md mb-2">
                    {service.description}
                  </p>
                  <p className="text-gray-400 text-sm">{service.duration}</p>
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
          className="px-4 sm:px-10 lg:px-20 xl:px-44 py-16 sm:py-20 bg-primary/95 grid xl:grid-cols-2 grid-cols-1 gap-8 lg:gap-12 w-full text-white"
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

            <p className="text-neutral-landing">
              Since 2009, Tols Barbershop has been the cornestone of gentleman's
              grooming in the city. Our master barbers combine time-honord
              techniques with contemporary styles to deliver an unparalleled
              experience.
            </p>

            <p className="text-neutral-landing">
              We believe every man deserves to look and feel his best. That's
              why we use only premium products and tools, ensuring each cut isa
              masterpiece and every shave is an indulgece.
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
          className="px-4 sm:px-10 lg:px-20 xl:px-44 py-16 sm:py-20 flex flex-col items-center text-white bg-primary"
        >
          <p className="mb-2 text-3xl sm:text-4xl lg:text-5xl font-semibold text-center">Our Gallery</p>
          <p className="mb-8 text-neutral-landing text-center">
            A glimpse into our world of classic grooming and modern
          </p>

          <div className="flex w-full justify-center gap-4 flex-wrap">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-6 py-2 border border-white/10  rounded-full transition-all duration-300 transform hover:scale-105 ${
                  activeCategory === category ? "bg-accent" : ""
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 gap-6 mt-10 w-full">
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
          className="px-4 sm:px-10 lg:px-20 xl:px-44 py-16 sm:py-20 flex flex-col items-center bg-primary/95 text-center text-white"
        >
          <p className="md:text-5xl sm:text-4xl text-3xl font-semibold mb-4 ">
            What Our Customer Say
          </p>
          <p className="text-sm text-neutral-landing mb-8">
            Don't just take our word for it - hear from our satisfied clients
          </p>

          <div className="px-5 sm:px-8 lg:px-12 py-8 sm:py-12 border border-white/12 relative flex flex-col items-center rounded-xl hover:scale-105 transition duration-300">
            <div className="flex gap-1 mb-8">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={50}
                  className={`w-7 h-7 ${
                    i < testimonials[currentIndex].rating
                      ? "text-accent fill-accent"
                      : "text-gray-400"
                  }`}
                />
              ))}
            </div>

            <p className="text-lg sm:text-xl lg:text-2xl mb-8">{testimonials[currentIndex].text}</p>

            <div className="flex items-center space-x-3 mb-1">
              <p className="px-4 py-3 bg-accent rounded-full font-bold">
                {testimonials[currentIndex].image}
              </p>
              <p>{testimonials[currentIndex].name}</p>
            </div>

            <div className="flex justify-between space-x-3 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-3 h-3 transition-all duration-300 rounded-full ${
                    currentIndex === index ? "w-10 bg-accent " : "bg-white"
                  }`}
                ></button>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer
        id="contact"
        className="flex flex-col border-y border-white/10 bg-primary text-white "
      >
        <div className="grid md:grid-cols-3 grid-cols-1 px-4 sm:px-8 lg:px-10 xl:px-32 py-12 gap-8 sm:gap-12">
          {/*Column 1*/}
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-5 ">
              <Image src="/logo.svg" alt="Logo" height={50} width={50} />
              <p className="text-xl">Tols Barbershop</p>
            </div>
            <p className="text-sm">
              Where traditional barbering meets modern style. Experience the
              finest in gentleman's grooming since 2009.
            </p>
          </div>

          {/*Column 2*/}
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
              <p className="text-sm">info@tolsbarbershop.com</p>
            </div>
          </div>

          {/*Column 3*/}
          <div className="flex flex-col">
            <div className="flex space-x-3 ">
              <p className="text-accent">
                <Clock className="text-white" size={28} />
              </p>
              <p className="text-xl mb-5">Opening Hours</p>
            </div>

            <div className="flex border-b border-white/10 pb-4 justify-between items-center">
              <p className="text-sm">Monday - Friday </p>
              <p className="text-sm">9:00 AM - 8:00 PM</p>
            </div>
            <div className="flex border-b border-white/10 pb-4 justify-between items-center">
              <p className="text-sm pt-4">Saturday</p>
              <p className="text-sm">9:00 AM - 6:00 PM</p>
            </div>

            <div className="flex border-b border-white/10 pb-4 justify-between items-center">
              <p className="text-sm pt-4">Sunday</p>
              <p className="text-sm">10:00 AM - 4:00 PM</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-4 sm:px-8 py-4 border-t border-white/10 text-center">
          <p className="text-sm text-neutral">
            &copy; 2024 Tols Barbershop. All rights reserved.
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
