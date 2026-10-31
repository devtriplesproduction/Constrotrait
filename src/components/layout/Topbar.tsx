"use client";

import React, { useState, useRef, useEffect, useMemo, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu, LogOut, ChevronDown, User, MapPin, Check, Briefcase, RefreshCw } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { logoutAction, switchActiveRoleAction } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/common/NotificationBell";
import { RoleIcon } from "@/components/common/RoleIcon";
import { getRoleDisplayName } from "@/config/roles";
import { SESSION_CONFIG } from "@/config/session";
import { cn } from "@/lib/utils/cn";

interface TopbarProps {
  user: SupabaseUser;
  role: string;
  roles?: string[];
  branchName?: string;
  onMenuClick: () => void;
  onRoleChange?: (newRole: string) => void;
}

export function Topbar({ user, role, roles = [], branchName, onMenuClick, onRoleChange }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  // Deduplicate and filter roles
  const uniqueRoles = useMemo(() => {
    const list = roles && roles.length > 0 ? roles : (role ? [role] : []);
    return Array.from(new Set(list.filter(Boolean)));
  }, [roles, role]);

  const hasMultipleRoles = uniqueRoles.length > 1;

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };

    if (isDropdownOpen || isRoleDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen, isRoleDropdownOpen]);

  const firstName = user?.user_metadata?.first_name || "User";
  const lastName = user?.user_metadata?.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim();
  const initials = firstName[0]?.toUpperCase() + (lastName[0]?.toUpperCase() || "");

  const handleRoleSelect = (selectedRole: string) => {
    if (selectedRole === role) {
      setIsRoleDropdownOpen(false);
      setIsDropdownOpen(false);
      return;
    }

    setIsRoleDropdownOpen(false);
    setIsDropdownOpen(false);

    // Immediate optimistic update on client layout
    onRoleChange?.(selectedRole);

    // Optimistically write client-side cookie
    document.cookie = `active_role=${selectedRole}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;

    startTransition(async () => {
      await switchActiveRoleAction(selectedRole);

      // Check if current route is allowed for the new active role
      const restrictedRoutes = [
        { path: "/branches", isAllowed: (r: string) => r === "SUPER_ADMIN" },
        { path: "/employees", isAllowed: (r: string) => ["SUPER_ADMIN", "HR", "BRANCH_MANAGER_ADMINISTRATIVE"].includes(r) },
        { path: "/hr/payroll", isAllowed: (r: string) => ["SUPER_ADMIN", "HR", "BRANCH_MANAGER_ADMINISTRATIVE"].includes(r) },
        { path: "/clients", isAllowed: (r: string) => ["SUPER_ADMIN", "BRANCH_MANAGER_ADMINISTRATIVE", "ADMIN_INWARD_CRE", "HR"].includes(r) },
        { path: "/tests", isAllowed: (r: string) => ["SUPER_ADMIN", "QUALITY_MANAGER", "TECHNICAL_MANAGER", "BRANCH_MANAGER_ADMINISTRATIVE", "ADMIN_INWARD_CRE"].includes(r) },
      ];

      const isBlocked = restrictedRoutes.some(
        route => pathname.startsWith(route.path) && !route.isAllowed(selectedRole)
      );

      if (isBlocked) {
        router.push("/dashboard");
      } else {
        router.refresh();
      }
    });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between px-4 sm:px-6 bg-white/80 backdrop-blur-xl border-b border-zinc-200 shadow-xs">
      {/* ── Left: Mobile hamburger & Branch Badge ── */}
      <div className="flex items-center gap-3">
        <Button
          variant="custom"
          onClick={onMenuClick}
          aria-label="Toggle navigation"
          className="p-2 -ml-2 rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </Button>
        {branchName && (
          <div className="hidden sm:flex items-center">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-50 to-orange-100/50 border border-orange-200/60 shadow-xs">
              <MapPin className="w-3.5 h-3.5 text-orange-600" />
              <span className="text-xs font-bold text-orange-800 tracking-wide uppercase">
                {branchName}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Right: Role Switcher Dropdown (if multiple roles) + Notifications + User Profile ── */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Role Switcher Dropdown (Shown when employee has multiple roles) */}
        {hasMultipleRoles ? (
          <div className="relative" ref={roleDropdownRef}>
            <button
              type="button"
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className={cn(
                "flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border transition-all text-left",
                "bg-white hover:bg-orange-50/60 hover:border-orange-300 shadow-xs cursor-pointer",
                isRoleDropdownOpen
                  ? "border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/50"
                  : "border-zinc-200"
              )}
              aria-expanded={isRoleDropdownOpen}
              title="Switch active role account"
            >
              <div className="w-7 h-7 rounded-lg bg-orange-100/80 flex items-center justify-center text-orange-700 flex-shrink-0">
                {isPending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-600" />
                ) : (
                  <RoleIcon role={role} className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="flex flex-col min-w-0 pr-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 leading-none">
                  Active Role
                </span>
                <span className="text-xs font-bold text-zinc-900 truncate max-w-[120px] sm:max-w-[190px] leading-tight mt-0.5">
                  {getRoleDisplayName(role)}
                </span>
              </div>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 flex-shrink-0",
                  isRoleDropdownOpen && "rotate-180 text-orange-600"
                )}
              />
            </button>

            {/* Role Switcher Dropdown Menu */}
            {isRoleDropdownOpen && (
              <div className="absolute top-full mt-2 right-0 w-72 bg-white border border-zinc-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-zinc-100 mb-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-zinc-900">Switch Role Account</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                      {uniqueRoles.length} Roles
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Select which account role to view and operate
                  </p>
                </div>

                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {uniqueRoles.map((r) => {
                    const isActive = r === role;
                    return (
                      <button
                        key={r}
                        type="button"
                        disabled={isPending}
                        onClick={() => handleRoleSelect(r)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all text-xs font-semibold group cursor-pointer",
                          isActive
                            ? "bg-orange-50 border border-orange-200/80 text-orange-950 shadow-xs"
                            : "hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 border border-transparent"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                              isActive
                                ? "bg-orange-600 text-white"
                                : "bg-zinc-100 text-zinc-600 group-hover:bg-orange-100 group-hover:text-orange-700"
                            )}
                          >
                            <RoleIcon role={r} className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className={cn("truncate font-bold", isActive ? "text-orange-900" : "text-zinc-800")}>
                              {getRoleDisplayName(r)}
                            </span>
                            {isActive && (
                              <span className="text-[10px] text-orange-600 font-semibold">
                                Currently Active
                              </span>
                            )}
                          </div>
                        </div>
                        {isActive && (
                          <div className="w-5 h-5 rounded-full bg-orange-600 flex items-center justify-center text-white flex-shrink-0 ml-2">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Single role badge (when user has only 1 role) */
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200/80 bg-zinc-50/70">
            <RoleIcon role={role} className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs font-semibold text-zinc-700">
              {getRoleDisplayName(role)}
            </span>
          </div>
        )}

        <NotificationBell />

        {/* User Profile Pill & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <div
            className="group flex items-center gap-2.5 cursor-pointer py-1 px-1.5 rounded-xl hover:bg-zinc-50 transition-colors"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <Avatar
              initials={initials}
              className="w-8 h-8 bg-orange-600"
              textClassName="text-white text-xs font-bold"
            />

            <div className="hidden md:flex flex-col items-start leading-none">
              <span className="text-sm font-bold text-zinc-900">
                {fullName}
              </span>
              <span
                className="text-[10px] text-zinc-500 font-black uppercase tracking-wider mt-0.5 truncate max-w-[140px]"
                title={getRoleDisplayName(role)}
              >
                {getRoleDisplayName(role)}
              </span>
            </div>

            <ChevronDown className="hidden md:block w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
          </div>

          {/* User Profile Menu */}
          {isDropdownOpen && (
            <div className="absolute top-full mt-2 right-0 w-60 bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/60">
                <p className="text-xs font-bold text-zinc-900 truncate">{fullName}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <RoleIcon role={role} className="w-3 h-3 text-orange-600" />
                  <span className="text-[11px] font-bold text-orange-700 truncate">
                    {getRoleDisplayName(role)}
                  </span>
                </div>
              </div>

              {/* Quick Role Switch in Profile Menu if user has multiple roles */}
              {hasMultipleRoles && (
                <div className="p-2 border-b border-zinc-100 bg-orange-50/20">
                  <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400 px-2 py-1 flex items-center gap-1.5">
                    <Briefcase className="w-3 h-3 text-zinc-400" />
                    Switch Role
                  </p>
                  <div className="space-y-0.5">
                    {uniqueRoles.map((r) => {
                      const isActive = r === role;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => handleRoleSelect(r)}
                          className={cn(
                            "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer",
                            isActive
                              ? "bg-orange-100/80 font-bold text-orange-900"
                              : "hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900"
                          )}
                        >
                          <span className="truncate">{getRoleDisplayName(r)}</span>
                          {isActive && <Check className="w-3 h-3 text-orange-600 ml-1.5 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 w-full text-left px-4 py-3 text-[13px] text-zinc-700 transition-all font-semibold">
                <User className="w-4 h-4 text-zinc-400" />
                My Profile
              </div>

              <form
                action={logoutAction}
                onSubmit={() => {
                  try {
                    localStorage.removeItem(SESSION_CONFIG.STORAGE_KEYS.LAST_ACTIVE);
                    localStorage.removeItem(SESSION_CONFIG.STORAGE_KEYS.LOGOUT_BROADCAST);
                  } catch {}
                }}
                className="w-full"
              >
                <Button
                  variant="custom"
                  type="submit"
                  className="flex items-center gap-3 w-full text-left px-4 py-3 text-[13px] text-red-600 hover:bg-red-50 transition-all font-semibold group/btn border-t border-zinc-100 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 transition-transform group-hover/btn:-translate-x-1" />
                  Sign out
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
