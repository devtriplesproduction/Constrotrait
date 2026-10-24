"use client";

import * as React from "react";
import { ChevronDown, Check, X, Search } from "lucide-react";
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
  searchPlaceholder?: string;
  searchInMenu?: boolean;
}

const SelectContext = React.createContext<{
  value?: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

export function Select({
  value,
  onValueChange,
  placeholder,
  children,
  className,
  buttonClassName,
  disabled,
  id,
  iconClassName,
  align = "left",
  isClearable = false,
  isSearchable = false,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  searchInMenu = true,
}: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [coords, setCoords] = React.useState({ top: 0, left: 0, width: 0, right: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [menuSearchQuery, setMenuSearchQuery] = React.useState("");

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
    if (!open) {
      setMenuSearchQuery("");
      return;
    }
    updateCoords();
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);

    const handleScrollOrResize = () => {
      updateCoords();
    };
    window.addEventListener("scroll", handleScrollOrResize, { capture: true });
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScrollOrResize, { capture: true });
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open]);

  const isSelectItem = (child: React.ReactNode): boolean => {
    if (!React.isValidElement(child)) return false;
    const props = child.props as any;
    if (props && props.value !== undefined) return true;
    if (child.type === SelectItem) return true;
    if ((child.type as any)?.displayName === "SelectItem") return true;
    if ((child.type as any)?.name === "SelectItem") return true;
    return false;
  };

  const findSelectedChild = (nodes: React.ReactNode, val: string | undefined): React.ReactElement<{ children: React.ReactNode }> | undefined => {
    let found: React.ReactElement | undefined;
    React.Children.forEach(nodes, (child) => {
      if (found) return;
      if (React.isValidElement(child)) {
        const props = child.props as { value?: unknown; children?: React.ReactNode };
        if (props.value !== undefined && props.value === val) {
          found = child as React.ReactElement;
        } else if (props.children && !isSelectItem(child)) {
          found = findSelectedChild(props.children, val);
        }
      }
    });
    return found as React.ReactElement<{ children: React.ReactNode }> | undefined;
  };

  const selectedChild = findSelectedChild(children, value);

  const countVisibleItems = (nodes: React.ReactNode): number => {
    let count = 0;
    React.Children.forEach(nodes, (child) => {
      if (!child) return;
      if (React.isValidElement(child)) {
        if (isSelectItem(child)) {
          count++;
        } else if ((child.props as any)?.children) {
          count += countVisibleItems((child.props as any).children);
        } else {
          count++;
        }
      }
    });
    return count;
  };

  // Filter children based on search query inside menu
  const filterChildren = (nodes: React.ReactNode, query: string): React.ReactNode => {
    if (!query.trim()) return nodes;
    const lower = query.toLowerCase().trim();

    return React.Children.map(nodes, (child) => {
      if (!React.isValidElement(child)) return child;

      const props = child.props as any;
      if (isSelectItem(child)) {
        const label = typeof props.children === "string" 
          ? props.children 
          : (props.value !== undefined ? String(props.value) : "");
        
        const valueStr = props.value !== undefined ? String(props.value) : "";

        if (label.toLowerCase().includes(lower) || valueStr.toLowerCase().includes(lower)) {
          return child;
        }
        return null;
      }

      if (child.type === SelectGroup || props.children) {
        const filteredGroupChildren = filterChildren(props.children, query);
        if (countVisibleItems(filteredGroupChildren) === 0) return null;
        return React.cloneElement(child, {}, filteredGroupChildren);
      }

      return null;
    });
  };

  const isMenuSearchActive = isSearchable && (searchInMenu || (searchValue === undefined && onSearchChange === undefined));
  const isFiltering = isMenuSearchActive && Boolean(menuSearchQuery.trim());
  const renderedChildren = isFiltering
    ? filterChildren(children, menuSearchQuery)
    : children;

  const visibleCount = isFiltering
    ? countVisibleItems(renderedChildren)
    : (countVisibleItems(children) || React.Children.count(children));

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
            minWidth: Math.max(coords.width, 200),
            zIndex: 99999
          }}
          id="select-portal-container"
          className={cn(
            "z-[99999] rounded-xl overflow-hidden",
            "bg-white border border-slate-200/80",
            "shadow-[0_12px_40px_-10px_rgba(22,23,36,0.12),0_4px_16px_-4px_rgba(22,23,36,0.08)] flex flex-col"
          )}
        >
          {isMenuSearchActive && (
            <div className="p-2 border-b border-slate-100 bg-white sticky top-0 z-10">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={menuSearchQuery}
                  onChange={(e) => setMenuSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 text-slate-800 placeholder:text-slate-400 transition-all"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Escape") {
                      setOpen(false);
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      const findFirstItem = (nodes: React.ReactNode): string | null => {
                        let result: string | null = null;
                        React.Children.forEach(nodes, (c) => {
                          if (result !== null || !React.isValidElement(c)) return;
                          if (isSelectItem(c)) {
                            result = (c.props as any).value;
                          } else if ((c.props as any)?.children) {
                            result = findFirstItem((c.props as any).children);
                          }
                        });
                        return result;
                      };
                      const firstVal = findFirstItem(renderedChildren);
                      if (firstVal !== null) {
                        onValueChange(firstVal);
                        setOpen(false);
                      }
                    }
                  }}
                />
                {menuSearchQuery && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuSearchQuery("");
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="p-1.5 flex-1 min-h-0 overflow-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent" style={{ maxHeight: "16rem" }}>
            {visibleCount > 0 ? (
              renderedChildren
            ) : (
              <div className="px-3 py-6 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-1.5">
                <Search className="w-4 h-4 text-slate-300" />
                <span>{menuSearchQuery ? `No options matching "${menuSearchQuery}"` : "No options available"}</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const isLegacySearchInput = isSearchable && !isMenuSearchActive;

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div ref={containerRef} className={cn("relative w-full", className)} id={id}>
        <Button variant="custom" type="button" onClick={handleToggle}
          disabled={disabled}
          className={cn(
            "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 outline-none select-none",
            "bg-white border border-slate-200",
            "text-slate-700 shadow-sm",
            "hover:bg-slate-50 hover:border-slate-300",
            "focus-visible:ring-4 focus-visible:ring-orange-500/10 focus-visible:border-orange-500",
            open && "ring-4 ring-orange-500/10 border-orange-500 bg-white",
            disabled && "opacity-50 cursor-not-allowed hover:bg-white hover:border-slate-200",
            buttonClassName
          )}
        >
          {isLegacySearchInput ? (
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
            <span className={cn("truncate", !value && "text-slate-400 font-normal")}>
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
        "relative flex w-full justify-between items-center text-left cursor-pointer select-none rounded-md py-2 px-3 text-sm font-medium outline-none transition-colors duration-150",
        "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
        isSelected && "text-orange-600 font-semibold bg-orange-50/50 hover:bg-orange-50/80",
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

SelectItem.displayName = "SelectItem";
SelectGroup.displayName = "SelectGroup";
