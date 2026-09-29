import React, { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, label, id, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={id}
            className="block text-xs font-bold text-foreground uppercase tracking-wide mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          type={type}
          id={id}
          ref={ref}
          className={cn(
            "flex h-11 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm shadow-sm transition-all duration-300 placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 text-foreground",
            error && "border-error focus:ring-error/20 focus:border-error",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
