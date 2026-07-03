import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner"
import { Poppins } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { RealtimeProvider } from "@/contexts/RealtimeContext";
import { PushNotificationProvider } from "@/components/common/PushNotificationProvider";
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
  title: "Tols Barbershop",
  description: "Premium barbershop experience",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
},
  appleWebApp: {
    capable: true,
    title: "TOLS Barbershop",
    statusBarStyle: "default",
  },
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
          <RealtimeProvider>
            <PushNotificationProvider />
            {children}
          </RealtimeProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
