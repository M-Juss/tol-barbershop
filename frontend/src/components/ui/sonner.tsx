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
          <CircleCheckIcon className="size-4 text-[var(--toast-success)]" />
        ),
        info: (
          <InfoIcon className="size-4 text-[var(--toast-info)]" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4 text-[var(--toast-warning)]" />
        ),
        error: (
          <OctagonXIcon className="size-4 text-[var(--toast-error)]" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin text-[var(--toast-loading)]" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "var(--popover)",
          "--success-text": "var(--popover-foreground)",
          "--success-border": "var(--border)",
          "--error-bg": "var(--popover)",
          "--error-text": "var(--popover-foreground)",
          "--error-border": "var(--border)",
          "--warning-bg": "var(--popover)",
          "--warning-text": "var(--popover-foreground)",
          "--warning-border": "var(--border)",
          "--info-bg": "var(--popover)",
          "--info-text": "var(--popover-foreground)",
          "--info-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
          description: "opacity-80",
          success: "border-l-4! border-l-[var(--toast-success)]!",
          error: "border-l-4! border-l-[var(--toast-error)]!",
          warning: "border-l-4! border-l-[var(--toast-warning)]!",
          info: "border-l-4! border-l-[var(--toast-info)]!",
          loading: "border-l-4! border-l-[var(--toast-loading)]!",
          actionButton:
            "border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
