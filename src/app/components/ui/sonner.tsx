"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ toastOptions, style, ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          ...style,
        } as React.CSSProperties
      }
      toastOptions={{
        ...toastOptions,
        style: {
          padding: "8px 12px",
          minHeight: "auto",
          ...toastOptions?.style,
        },
        classNames: {
          toast: "gap-2 rounded-lg text-sm",
          content: "gap-0.5",
          title: "text-xs leading-tight",
          description: "text-[11px] leading-snug",
          icon: "h-4 w-4",
          closeButton: "h-5 w-5",
          ...toastOptions?.classNames,
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
