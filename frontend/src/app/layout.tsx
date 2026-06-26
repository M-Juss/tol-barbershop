import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner"
import { Poppins } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Tols Barbershop",
  description: "Premium barbershop experience",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-dvh flex flex-col bg-background font-sans">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
