import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { Poppins } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { RealtimeProvider } from "@/contexts/RealtimeContext";
import { cn } from "@/lib/utils";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#C0392B",
};

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "TOL Barbershop",
  description: "Premium barbershop experience",
  manifest: "/manifest.json",
  icons: {
    icon: "/Tol-Logo-White-Bg.png",
    apple: "/Tol-Logo-White-Bg.png",
  },
  appleWebApp: {
    capable: true,
    title: "TOL Barbershop",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(poppins.variable, "h-full", "antialiased")}>
      <body className="min-h-dvh flex flex-col bg-background font-sans">
        <AuthProvider>
          <RealtimeProvider>
            {children}
          </RealtimeProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
