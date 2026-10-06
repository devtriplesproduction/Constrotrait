"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, User, Mail, Phone, MapPin, FileText, Search, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getJobEntriesByClientIdAction } from "@/actions/job-entry.actions";
import { downloadJobCardAction } from "@/actions/job-card-pdf.actions";
import { Database } from "@/types/database";

type Client = Database["public"]["Tables"]["clients"]["Row"];
type JobEntry = Database["public"]["Tables"]["job_entries"]["Row"];
type JobEntryTest = Database["public"]["Tables"]["job_entry_tests"]["Row"];

interface JobEntryWithTests extends JobEntry {
  job_entry_tests: JobEntryTest[];
}

import ClientDetailsWizard from "./ClientDetailsWizard";

export default function ClientsTab({
  initialClients,
  onEditClick,
  triggerRefresh, // Used to re-fetch if needed
}: {
  initialClients: Client[];
  onEditClick: (test: JobEntryTest, client: Client) => void;
  triggerRefresh: number;
}) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredClients = initialClients.filter((client) => {
    const query = searchQuery.toLowerCase();
    return (
      client.name?.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.mobile?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Search / Filter Card */}
      <div className="relative bg-white/80 backdrop-blur-xl p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200/80 transition-all duration-300 hover:shadow-md hover:border-orange-200/80 group overflow-hidden">
        {/* Subtle gradient accent */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-orange-400 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out" />

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <div className="bg-orange-50 p-1.5 rounded-lg border border-orange-100/50 text-orange-500 shadow-sm group-hover:bg-orange-100 transition-colors duration-300">
              <Search className="h-4 w-4" />
            </div>
            Search Clients
          </h3>

          <div className="w-full sm:max-w-md">
            <Input
              placeholder="Search by name, email, or contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 bg-slate-50/50 border-slate-200 focus-visible:ring-orange-500/20 focus-visible:border-orange-400 hover:border-orange-300 transition-all shadow-sm rounded-xl"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filteredClients.map((client) => {
          return (
            <Card
              key={client.id}
              className="group relative bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all flex flex-col p-5 gap-4 cursor-pointer overflow-hidden isolate"
              onClick={() => setSelectedClient(client)}
            >
              {/* Top-right curved accent background */}
              <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-orange-50/50 rounded-bl-full pointer-events-none -z-10" />

              {/* Header */}
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base leading-tight">{client.name}</h3>
                    <p className="font-semibold text-orange-500 text-xs mt-1">{client.email || "No Email"}</p>
                  </div>
                </div>

                {/* Client Badge */}
                <div className="bg-orange-50 text-orange-700 px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1.5 border border-orange-100/50">
                  <User className="w-3 h-3" /> {client.company_name || "Client Profile"}
                </div>
              </div>

              {/* Information Grid */}
              <div className="bg-slate-50/80 rounded-xl p-4 grid grid-cols-2 gap-4 border border-slate-100/50 relative z-10">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Phone</p>
                  <p className="text-sm font-semibold text-slate-700">{client.mobile || "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">GST No</p>
                  <div className="bg-slate-200/50 px-2.5 py-0.5 rounded-md text-xs font-semibold text-slate-700 inline-block border border-slate-200/60">
                    {client.gst_no || "N/A"}
                  </div>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Address</p>
                  <p className="text-sm font-medium text-slate-600 line-clamp-1" title={client.address || "No address provided"}>
                    {client.address || "No address provided"}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end mt-1 relative z-10">
                <Button
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-sm shadow-orange-500/20 font-bold h-9 px-5 text-sm w-full sm:w-auto transition-colors"
                >
                  View Details
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredClients.length === 0 && (
        <div className="text-center py-12 text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200">
          No clients match your search criteria.
        </div>
      )}

      {selectedClient && (
        <ClientDetailsWizard
            client={selectedClient}
            onClose={() => setSelectedClient(null)}
            onEditClick={onEditClick}
          />
      )}
    </div>
  );
}
