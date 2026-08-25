"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

import { Button } from "@/components/ui/button";
export interface SidebarLink {
  title: string;
  href?: string;
  icon?: React.ElementType;
  subLinks?: { title: string; href: string; icon?: React.ElementType }[];
  isSeparator?: boolean;
}

interface BaseSidebarProps {
  links: SidebarLink[];
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function BaseSidebar({ links, isOpen, setIsOpen }: BaseSidebarProps) {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>({});

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname, setIsOpen]);

  const currentTheme = {
    bg: "bg-orange-50 text-primary border border-orange-100",
    text: "text-primary",
    border: "border-orange-100",
    logoBg: "bg-primary text-white",
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen flex flex-col w-[260px]",
          "bg-white border-r border-zinc-200",
          "transition-transform duration-300 ease-in-out lg:relative",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo / Brand */}
        <div className="flex h-16 items-center border-b border-zinc-200 flex-shrink-0 px-5 gap-3">
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-black text-sm",
              currentTheme.logoBg
            )}
          >
            <span>CT</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-zinc-900 truncate leading-tight tracking-tight">
              ConstroTrait
            </p>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-tight">
              Workspace
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto no-scrollbar py-4 px-3 space-y-0.5">
          {links.map((link, idx) => {
            if (link.isSeparator) {
              return (
                <div
                  key={`sep-${idx}`}
                  className="my-3 border-t border-zinc-200"
                />
              );
            }
            if (link.subLinks && link.subLinks.length > 0) {
              const isOpenMenu = openMenus[link.title];
              const isAnyChildActive = link.subLinks.some(
                (sub) => pathname === sub.href || pathname.startsWith(sub.href + "/")
              );
              const Icon = link.icon || (() => null);
              return (
                <div key={link.title} className="space-y-0.5">
                  <Button variant="custom" onClick={() => toggleMenu(link.title)}
                    className={cn(
                      "w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                      isAnyChildActive
                        ? cn("bg-orange-50", "text-primary")
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          "w-[18px] h-[18px] flex-shrink-0",
                          isAnyChildActive ? "text-primary" : "text-zinc-400"
                        )}
                        strokeWidth={isAnyChildActive ? 2.2 : 1.8}
                      />
                      <span className="truncate">{link.title}</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-zinc-400 transition-transform duration-200",
                        isOpenMenu ? "rotate-180" : ""
                      )}
                    />
                  </Button>
                  {isOpenMenu && (
                    <div className="pl-9 pr-2 py-1 space-y-1 animate-in slide-in-from-top-1 fade-in duration-200">
                      {link.subLinks.map((sub) => {
                        const isSubActive =
                          pathname === sub.href || pathname.startsWith(sub.href + "/");
                        const SubIcon = sub.icon;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            prefetch={true}
                            className={cn(
                              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                              isSubActive
                                ? cn("bg-orange-50", "text-primary")
                                : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                            )}
                          >
                            {SubIcon ? (
                              <SubIcon className="w-4 h-4" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                            )}
                            <span className="truncate">{sub.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Normal links
            const isActive = link.href
              ? link.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === link.href || pathname.startsWith(link.href + "/")
              : false;

            const Icon = link.icon || (() => null);

            return (
              <Link
                key={link.title}
                href={link.href || "#"}
                prefetch={true}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                  isActive
                    ? cn("bg-orange-50", "text-primary")
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                )}
              >
                <Icon
                  className={cn(
                    "w-[18px] h-[18px] flex-shrink-0",
                    isActive ? "text-primary" : "text-zinc-400 group-hover:text-zinc-600"
                  )}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span className="truncate">{link.title}</span>
              </Link>
            );
          })}
        </nav>

        {/* Profile & Sign Out (Optional in Sidebar, can rely on Topbar) */}
        {/* We keep it clean and only have sign out in Topbar, but if you want it here: */}
        {/* <div className="p-4 border-t border-zinc-200  space-y-1"> ... </div> */}
      </aside>
    </>
  );
}

