"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const sonnerTheme: ToasterProps["theme"] = theme === "ink" ? "dark" : "light"

  return (
    <Sonner
      theme={sonnerTheme}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "var(--status-positive-bg)",
          "--success-border": "var(--status-positive-border)",
          "--success-text": "var(--status-positive-text)",
          "--info-bg": "var(--status-info-bg)",
          "--info-border": "var(--status-info-border)",
          "--info-text": "var(--status-info-text)",
          "--warning-bg": "var(--status-advice-bg)",
          "--warning-border": "var(--status-advice-border)",
          "--warning-text": "var(--status-advice-text)",
          "--error-bg": "var(--status-danger-bg)",
          "--error-border": "var(--status-danger-border)",
          "--error-text": "var(--status-danger-text)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
          title: "cn-toast-title",
          description: "cn-toast-description",
          closeButton: "cn-toast-close",
          actionButton: "cn-toast-action",
          cancelButton: "cn-toast-cancel",
          success: "cn-toast-success",
          info: "cn-toast-info",
          warning: "cn-toast-warning",
          error: "cn-toast-error",
          loading: "cn-toast-loading",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
