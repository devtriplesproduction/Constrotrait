"use client";

import * as React from "react";
import { ChevronDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { motion, AnimatePresence } from "framer-motion";

import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";

export function SelectLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("px-3.5 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 sticky top-0 backdrop-blur-sm z-10", className)}>
      {children}
    </div>
  );
}

export function SelectGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("py-1", className)}>
      {children}
    </div>
  );
}

export interface SelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  id?: string;
  iconClassName?: string;
  align?: "left" | "right";
  isClearable?: boolean;
  isSearchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

const SelectContext = React.createContext<{
  value?: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

export function Select({ value, onValueChange, placeholder, children, className, buttonClassName, disabled, id, iconClassName, align = "left", isClearable = false, isSearchable = false, searchValue, onSearchChange }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [coords, setCoords] = React.useState({ top: 0, left: 0, width: 0, right: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width,
        right: window.innerWidth - (rect.right + window.scrollX),
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
        // Also check if clicked inside the portal
        const portalEl = document.getElementById("select-portal-container");
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
    const handleScrollOrResize = () => {
      updateCoords();
    };
    window.addEventListener("scroll", handleScrollOrResize, { capture: true });
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, { capture: true });
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open]);

  const findSelectedChild = (nodes: React.ReactNode, val: string | undefined): React.ReactElement<{ children: React.ReactNode }> | undefined => {
    let found: React.ReactElement | undefined;
    React.Children.forEach(nodes, (child) => {
      if (found) return;
      if (React.isValidElement(child)) {
        const props = child.props as { value?: any; children?: React.ReactNode };
        if (props.value !== undefined && props.value === val) {
          found = child as React.ReactElement;
        } else if (props.children) {
          found = findSelectedChild(props.children, val);
        }
      }
    });
    return found as React.ReactElement<{ children: React.ReactNode }> | undefined;
  };

  const selectedChild = findSelectedChild(children, value);

  const dropdown = (
    <AnimatePresence>
      {open && (
        <motion.div 
          key="select-dropdown"
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={{
            position: "absolute",
            top: coords.top,
            ...(align === "right" ? { right: coords.right } : { left: coords.left }),
            minWidth: Math.max(coords.width, 140),
            zIndex: 99999
          }}
          id="select-portal-container"
          className={cn(
            "z-[99999] rounded-xl overflow-hidden",
            "bg-white/95  backdrop-blur-xl",
            "border border-slate-200/80 ",
            "shadow-xl shadow-slate-200/50 flex flex-col"
          )}
        >
          <div className="p-1.5 flex-1 min-h-0 overflow-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent" style={{ maxHeight: "16rem" }}>
            {React.Children.count(children) > 0 ? (
              children
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
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div ref={containerRef} className={cn("relative w-full", className)} id={id}>
        <Button variant="custom" type="button" onClick={handleToggle}
          disabled={disabled}
          className={cn(
            "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 outline-none select-none",
            "bg-white/40  backdrop-blur-md border border-slate-200/60 ",
            "text-slate-700  shadow-sm",
            "hover:bg-white/60 hover:border-orange-300/50",
            "focus-visible:ring-2 focus-visible:ring-orange-500/30 focus-visible:border-orange-400",
            open && "ring-2 ring-orange-500/20 border-orange-400  bg-white/80  shadow-md",
            disabled && "opacity-50 cursor-not-allowed hover:bg-white/40 hover:border-slate-200/60",
            buttonClassName
          )}
        >
          {isSearchable ? (
            <input
              type="text"
              className={cn("w-full bg-transparent border-none outline-none focus:ring-0 p-0 text-sm truncate", (!value && !open && !searchValue) ? "text-slate-400 font-normal" : "text-slate-700")}
              placeholder={typeof placeholder === "string" ? placeholder : "Search..."}
              value={open ? (searchValue || "") : (selectedChild ? (selectedChild.props.children as string) : "")}
              onChange={(e) => {
                onSearchChange?.(e.target.value);
                if (!open) {
                   updateCoords();
                   setOpen(true);
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!open) {
                   updateCoords();
                   setOpen(true);
                }
              }}
            />
          ) : (
            <span className={cn("truncate", !value && "text-slate-400  font-normal")}>
              {selectedChild ? selectedChild.props.children : placeholder}
            </span>
          )}
          <div className="flex items-center gap-1 ml-2">
            {isClearable && value && (
              <div 
                className="p-0.5 rounded-md hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onValueChange("");
                }}
              >
                <X className="h-4 w-4 flex-shrink-0" />
              </div>
            )}
            <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform duration-300 flex-shrink-0", open && "rotate-180 text-orange-500", iconClassName)} />
          </div>
        </Button>
        
        {mounted && createPortal(dropdown, document.body)}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectItem({ 
  value, 
  children, 
  className 
}: { 
  value: string; 
  children: React.ReactNode; 
  className?: string 
}) {
  const context = React.useContext(SelectContext);
  const isSelected = context?.value === value;

  return (
    <Button variant="custom" type="button" onClick={() => { context?.onValueChange(value); context?.setOpen(false); }}
      className={cn(
        "relative flex w-full justify-between items-center text-left cursor-pointer select-none rounded-lg py-2.5 px-3.5 text-sm font-medium outline-none transition-all duration-200",
        "text-slate-600  hover:bg-slate-100 hover:text-slate-900",
        isSelected && "text-orange-600  font-semibold bg-orange-50/80 ",
        className
      )}
    >
      <span className="flex-1 text-left break-words">{children}</span>
      <span className="flex h-4 w-4 items-center justify-center shrink-0 ml-2">
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Check className="h-4 w-4 text-orange-600  stroke-[2.5]" />
          </motion.div>
        )}
      </span>
    </Button>
  );
}

