"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search, Building2, X, Check, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ClientItem {
  id: string;
  name: string;
  company_name: string | null;
  project_name: string | null;
  site_name: string | null;
  contact_person: string | null;
  mobile: string | null;
  agency_name: string | null;
}

interface ClientSearchInputProps {
  clients: ClientItem[];
  selectedClientId?: string;
  onSelectClient: (client: ClientItem | null) => void;
  className?: string;
}

export function ClientSearchInput({
  clients = [],
  selectedClientId,
  onSelectClient,
  className,
}: ClientSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const prevSelectedIdRef = useRef(selectedClientId);

  // Sync selected client display name
  useEffect(() => {
    if (selectedClientId) {
      const found = clients.find((c) => c.id === selectedClientId);
      if (found) {
        setQuery(found.name || found.company_name || "");
      }
    } else if (prevSelectedIdRef.current && !selectedClientId) {
      setQuery("");
    }
    prevSelectedIdRef.current = selectedClientId;
  }, [selectedClientId, clients]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredClients = useMemo(() => {
    if (!query.trim()) {
      return clients.slice(0, 10);
    }
    const q = query.toLowerCase().trim();
    return clients.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const company = (c.company_name || "").toLowerCase();
      const project = (c.project_name || "").toLowerCase();
      const site = (c.site_name || "").toLowerCase();
      const contact = (c.contact_person || "").toLowerCase();
      return (
        name.includes(q) ||
        company.includes(q) ||
        project.includes(q) ||
        site.includes(q) ||
        contact.includes(q)
      );
    });
  }, [clients, query]);

  const handleSelect = (client: ClientItem) => {
    setQuery(client.name || client.company_name || "");
    setIsOpen(false);
    onSelectClient(client);
  };

  const handleClear = () => {
    setQuery("");
    onSelectClient(null);
    setIsOpen(false);
  };

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
        <span>Autofill from Client</span>
        <span className="text-[10px] text-orange-600 font-semibold normal-case">
          Search with suggestions
        </span>
      </label>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>

        <Input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search client, company or site..."
          className="pl-9 pr-9 h-10 rounded-xl text-xs font-medium border-slate-200 focus:border-orange-500 bg-white"
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

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in-50 zoom-in-95 duration-150">
          <div className="px-3 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>Client Suggestions ({filteredClients.length})</span>
            <span className="text-[10px] text-orange-600 font-medium">Click to autofill</span>
          </div>

          {filteredClients.length > 0 ? (
            <div className="p-1 space-y-0.5">
              {filteredClients.map((client) => {
                const displayName = client.name || client.company_name || "Unnamed Client";
                const isSelected = selectedClientId === client.id;
                const siteInfo = [client.project_name, client.site_name].filter(Boolean).join(" • ");

                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleSelect(client)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 text-xs transition-colors",
                      isSelected
                        ? "bg-orange-50 text-orange-950 font-semibold"
                        : "hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-[11px] flex-shrink-0">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {displayName}
                        </p>
                        {siteInfo && (
                          <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span>{siteInfo}</span>
                          </p>
                        )}
                        {client.contact_person && (
                          <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3 text-slate-300 flex-shrink-0" />
                            <span>{client.contact_person} {client.mobile ? `(${client.mobile})` : ""}</span>
                          </p>
                        )}
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
            <div className="p-4 text-center text-xs text-slate-500">
              <p className="font-medium">No matching client found</p>
              <p className="text-[11px] text-slate-400 mt-1">
                You can manually fill in the Customer & Site fields below.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
