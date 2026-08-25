import React, { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  variant?: "primary" | "secondary" | "accent" | "outline" | "ghost" | "danger" | "custom";
  size?: "sm" | "md" | "lg" | "icon" | "none";
  isLoading?: boolean;
  customColor?: string;
  customTextColor?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      customColor,
      customTextColor,
      style,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-md cursor-pointer";

    const variantStyles = {
      primary:
        "bg-primary text-primary-foreground hover:brightness-110 focus-visible:ring-primary",
      secondary:
        "bg-surface text-foreground border border-border hover:bg-background focus-visible:ring-primary",
      accent:
        "bg-accent text-accent-foreground hover:brightness-110 focus-visible:ring-accent",
      outline:
        "border border-border bg-transparent hover:bg-background text-foreground focus-visible:ring-primary",
      ghost:
        "bg-transparent hover:bg-background text-foreground focus-visible:ring-primary",
      danger:
        "bg-error text-error-foreground hover:bg-red-700 focus-visible:ring-error",
      custom: "", // Allows fully custom Tailwind styling via className
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs rounded-md",
      md: "h-10 px-4 text-sm rounded-lg",
      lg: "h-12 px-6 text-base rounded-xl",
      icon: "h-10 w-10 p-2 rounded-lg",
      none: "",
    };

    // Apply custom inline colors if provided
    const dynamicStyle: React.CSSProperties = {
      ...(customColor ? { backgroundColor: customColor, borderColor: customColor } : {}),
      ...(customTextColor ? { color: customTextColor } : {}),
      ...style,
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        style={dynamicStyle}
        {...props}
      >
        {isLoading ? (
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
