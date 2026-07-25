"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const [position, setPosition] = useState<ToasterProps["position"]>("bottom-right")

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)")
    const updatePosition = () => {
      setPosition(mediaQuery.matches ? "top-center" : "bottom-right")
    }

    updatePosition()
    mediaQuery.addEventListener("change", updatePosition)

    return () => mediaQuery.removeEventListener("change", updatePosition)
  }, [])

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position={position}
      className="toaster group"
      richColors
      icons={{
        success: (
          <CircleCheckIcon className="size-4 text-[#166534]" />
        ),
        info: (
          <InfoIcon className="size-4 text-[#1E40AF]" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4 text-[#92400E]" />
        ),
        error: (
          <OctagonXIcon className="size-4 text-[#991B1B]" />
        ),
        loading: (
          <Loader2Icon className="size-4 text-[#374151] animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "#FFFFFF",
          "--normal-text": "#111827",
          "--normal-border": "#E5E7EB",
          "--success-bg": "#DCFCE7",
          "--success-text": "#166534",
          "--success-border": "#86EFAC",
          "--error-bg": "#FEE2E2",
          "--error-text": "#991B1B",
          "--error-border": "#FCA5A5",
          "--warning-bg": "#FEF3C7",
          "--warning-text": "#92400E",
          "--warning-border": "#FCD34D",
          "--info-bg": "#DBEAFE",
          "--info-text": "#1E40AF",
          "--info-border": "#93C5FD",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
          description: "opacity-80",
          actionButton: "bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
