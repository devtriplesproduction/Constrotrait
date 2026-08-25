"use client";

import React, { useState, useRef, useEffect } from "react";
import { Menu, LogOut, ChevronDown, User } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { logoutAction } from "@/actions/auth.actions";

import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/common/NotificationBell";

interface TopbarProps {
  user: SupabaseUser;
  role: string;
  onMenuClick: () => void;
}

export function Topbar({ user, role, onMenuClick }: TopbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const firstName = user?.user_metadata?.first_name || "User";
  const lastName = user?.user_metadata?.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim();

  const initials = firstName[0]?.toUpperCase() + (lastName[0]?.toUpperCase() || "");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between px-6 bg-white/80 backdrop-blur-xl border-b border-zinc-200">
      {/* ── Left: Mobile hamburger ── */}
      <div className="flex items-center gap-4">
        <Button variant="custom" onClick={onMenuClick}
          aria-label="Open navigation"
          className="lg:hidden p-2 -ml-2 rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* ── Right: Notifications & User Profile ── */}
      <div className="flex items-center gap-4 relative" ref={dropdownRef}>
        <NotificationBell />

        <div
          className="group flex items-center gap-2.5 cursor-pointer"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <Avatar
            initials={initials}
            className="w-8 h-8 bg-orange-600"
            textClassName="text-white text-xs"
          />

          <div className="hidden md:flex flex-col items-start leading-none">
            <span className="text-sm font-bold text-zinc-900">
              {fullName}
            </span>
            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-0.5 truncate max-w-[150px]" title={role?.replace(/_/g, " ")}>
              {role?.replace(/_/g, " ")}
            </span>
          </div>

          <ChevronDown className="hidden md:block w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
        </div>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute top-full mt-2 right-0 w-52 bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
              <p className="text-xs font-bold text-zinc-900 truncate">{fullName}</p>
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest truncate mt-0.5">
                {role?.replace(/_/g, " ")}
              </p>
            </div>

            <div className="flex items-center gap-3 w-full text-left px-4 py-3 text-[13px] text-zinc-700 transition-all font-semibold">
              <User className="w-4 h-4 text-zinc-400" />
              My Profile
            </div>

            <form action={logoutAction} className="w-full">
              <Button variant="custom" type="submit" className="flex items-center gap-3 w-full text-left px-4 py-3 text-[13px] text-red-600 hover:bg-red-50 transition-all font-semibold group/btn border-t border-zinc-100"
              >
                <LogOut className="w-4 h-4 transition-transform group-hover/btn:-translate-x-1" />
                Sign out
              </Button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}

