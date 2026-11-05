"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { StaffMember } from "@/types/delivery-challan";
import { Input } from "@/components/ui/input";
import { Search, User, X, Check, Building, Briefcase, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface EmployeeSearchInputProps {
  value: string;
  onChange: (value: string, staffMember?: StaffMember) => void;
  staff: StaffMember[];
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  filterRole?: (s: StaffMember) => boolean;
  helperText?: string;
}

export function EmployeeSearchInput({
  value,
  onChange,
  staff = [],
  placeholder = "Search employee name or enter custom name...",
  label,
  required = false,
  className,
  disabled = false,
  filterRole,
  helperText,
}: EmployeeSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep internal query in sync if parent changes value
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredStaff = useMemo(() => {
    const list = filterRole ? staff.filter(filterRole) : staff;
    if (!query.trim()) {
      return list.slice(0, 8); // show first 8 employees by default
    }
    const q = query.toLowerCase().trim();
    return list.filter((s) => {
      const fullName = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase();
      const empId = (s.employee_id || "").toLowerCase();
      const desig = (s.designation || "").toLowerCase();
      const dept = (s.department || "").toLowerCase();
      return (
        fullName.includes(q) ||
        empId.includes(q) ||
        desig.includes(q) ||
        dept.includes(q)
      );
    });
  }, [staff, query, filterRole]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    onChange(val);
  };

  const handleSelect = (member: StaffMember) => {
    const fullName = `${member.first_name || ""} ${member.last_name || ""}`.trim();
    setQuery(fullName);
    setIsOpen(false);
    onChange(fullName, member);
  };

  const handleClear = () => {
    setQuery("");
    onChange("");
    setIsOpen(false);
  };

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
          <span>
            {label} {required && <span className="text-rose-500">*</span>}
          </span>
          <span className="text-[10px] text-slate-400 font-normal">
            Search or type name
          </span>
        </label>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>

        <Input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="pl-9 pr-9 h-10 rounded-xl text-xs font-medium border-slate-200 focus:border-orange-500 focus:ring-orange-500/20 bg-white"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {helperText && (
        <p className="text-[11px] text-slate-500 mt-1">{helperText}</p>
      )}

      {/* Floating Suggestions Popover */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in-50 zoom-in-95 duration-150">
          <div className="px-3 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>Employee Suggestions ({filteredStaff.length})</span>
            <span className="text-[10px] text-orange-600 font-medium">Click to select</span>
          </div>

          {filteredStaff.length > 0 ? (
            <div className="p-1 space-y-0.5">
              {filteredStaff.map((member) => {
                const fullName = `${member.first_name || ""} ${member.last_name || ""}`.trim();
                const initials = `${(member.first_name || "")[0] || ""}${(member.last_name || "")[0] || ""}`.toUpperCase() || "E";
                const isSelected = query.trim().toLowerCase() === fullName.toLowerCase();

                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleSelect(member)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-xl flex items-center justify-between gap-3 text-xs transition-colors",
                      isSelected
                        ? "bg-orange-50 text-orange-950 font-semibold"
                        : "hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-[11px] flex-shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                          <span>{fullName}</span>
                          {member.employee_id && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({member.employee_id})
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          {member.designation && (
                            <span>{member.designation}</span>
                          )}
                          {member.designation && member.department && <span>•</span>}
                          {member.department && (
                            <span>{member.department}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-orange-600 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-500 space-y-1">
              <p className="font-medium">No matching employee found</p>
              <p className="text-[11px] text-slate-400">
                You can keep typing to use &quot;{query}&quot; as a custom external person.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
