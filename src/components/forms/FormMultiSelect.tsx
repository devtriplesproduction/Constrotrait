"use client";

import React from "react";
import { Controller, Control, FieldValues, Path } from "react-hook-form";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
export interface FormMultiSelectOption {
  value: string;
  label: string;
}

export interface FormMultiSelectProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  options: FormMultiSelectOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
}

export function FormMultiSelect<T extends FieldValues>({
  name,
  control,
  options,
  placeholder = "Select options",
  className,
  buttonClassName,
  disabled,
}: FormMultiSelectProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [coords, setCoords] = React.useState({ top: 0, left: 0, width: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  const [placement, setPlacement] = React.useState<"bottom" | "top">("bottom");

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      let newPlacement: "bottom" | "top" = "bottom";
      if (spaceBelow < 250 && spaceAbove > spaceBelow) {
        newPlacement = "top";
      }
      
      setPlacement(newPlacement);
      setCoords({
        top: newPlacement === "bottom" ? rect.bottom + window.scrollY + 8 : rect.top + window.scrollY - 8,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  const handleToggle = () => {
    if (disabled) return;
    updateCoords();
    setOpen(!open);
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        const portalEl = document.getElementById("multiselect-portal-container");
        if (portalEl && portalEl.contains(event.target as Node)) {
          return;
        }
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const handleScrollOrResize = () => updateCoords();
    window.addEventListener("scroll", handleScrollOrResize, { capture: true });
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, { capture: true });
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open]);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const selectedValues: string[] = Array.isArray(field.value) ? field.value : [];
        const isSelected = (val: string) => selectedValues.includes(val);
        
        const toggleValue = (val: string) => {
          if (isSelected(val)) {
            field.onChange(selectedValues.filter((v) => v !== val));
          } else {
            field.onChange([...selectedValues, val]);
          }
        };

        const selectedLabels = options
          .filter((opt) => selectedValues.includes(opt.value))
          .map((opt) => opt.label);
          
        const displayValue = selectedLabels.length > 0 
          ? selectedLabels.join(", ") 
          : placeholder;

        const dropdown = (
          <AnimatePresence>
            {open && (
              <motion.div
                key="multiselect-dropdown"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                style={{
                  position: "absolute",
                  ...(placement === "top" 
                    ? { bottom: document.documentElement.scrollHeight - coords.top } 
                    : { top: coords.top }),
                  left: coords.left,
                  width: coords.width,
                  zIndex: 99999,
                }}
                id="multiselect-portal-container"
                className={cn(
                  "z-[99999] rounded-xl overflow-hidden",
                  "bg-white/95  backdrop-blur-xl",
                  "border border-slate-200/80 ",
                  "shadow-xl shadow-slate-200/50 ",
                  placement === "top" ? "origin-bottom" : "origin-top"
                )}
              >
                <div className="p-1.5 max-h-64 overflow-auto scrollbar-thin scrollbar-thumb-slate-200  scrollbar-track-transparent">
                  {options.length > 0 ? (
                    options.map((option) => (
                      <Button variant="custom"                         key={option.value}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          toggleValue(option.value);
                        }}
                        className={cn(
                          "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2.5 pl-9 pr-4 text-sm font-medium outline-none transition-all duration-200",
                          "text-slate-600  hover:bg-slate-100 hover:text-slate-900",
                          isSelected(option.value) && "text-orange-600  font-semibold bg-orange-50/80 "
                        )}
                      >
                        <span className="absolute left-3 flex h-4 w-4 items-center justify-center">
                          {isSelected(option.value) && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            >
                              <Check className="h-4 w-4 text-orange-600  stroke-[2.5]" />
                            </motion.div>
                          )}
                        </span>
                        <span className="truncate">{option.label}</span>
                      </Button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-center text-sm text-slate-500 ">
                      No options available
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        );

        return (
          <div ref={containerRef} className={cn("relative w-full", className)}>
            <Button variant="custom"               type="button"
              onClick={handleToggle}
              disabled={disabled || field.disabled}
              className={cn(
                "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 outline-none select-none",
                "bg-white/40  backdrop-blur-md border border-slate-200/60 ",
                "text-slate-700  shadow-sm",
                "hover:bg-white/60 hover:border-orange-300/50",
                "focus-visible:ring-2 focus-visible:ring-orange-500/30 focus-visible:border-orange-400",
                open && "ring-2 ring-orange-500/20 border-orange-400  bg-white/80  shadow-md",
                (disabled || field.disabled) && "opacity-50 cursor-not-allowed hover:bg-white/40 hover:border-slate-200/60",
                buttonClassName
              )}
            >
              <span className={cn("truncate", selectedLabels.length === 0 && "text-slate-400  font-normal")}>
                {displayValue}
              </span>
              <ChevronDown className={cn("h-4 w-4 text-slate-400  transition-transform duration-300 flex-shrink-0 ml-2", open && "rotate-180 text-orange-500")} />
            </Button>
            {mounted && createPortal(dropdown, document.body)}
          </div>
        );
      }}
    />
  );
}

