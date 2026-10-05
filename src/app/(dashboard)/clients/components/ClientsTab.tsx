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
              className="group relative bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex p-5 gap-5 cursor-pointer overflow-hidden isolate"
              onClick={() => setSelectedClient(client)}
            >
              {/* Top-right curved accent background */}
              <div className="absolute top-0 right-0 w-[140px] h-[130px] bg-[#FFF8F3] rounded-bl-[120px] pointer-events-none -z-10" />

              {/* Left Section */}
              <div className="flex-1 flex flex-col gap-5 relative z-10">

                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 shrink-0 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                      <User className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg leading-tight">{client.name}</h3>
                      <p className="font-bold text-orange-500 text-sm mt-1">{client.email || "No Email"}</p>
                    </div>
                  </div>

                  {/* Client Badge */}
                  <div className="bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border border-orange-100/50">
                    <User className="w-3.5 h-3.5" /> {client.company_name || "Client Profile"}
                  </div>
                </div>

                {/* Middle block */}
                <div className="bg-slate-50/80 rounded-2xl p-4 flex gap-6 border border-slate-100/50">
                  <div className="flex-1">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Phone</p>
                    <p className="text-[15px] font-semibold text-slate-700">{client.mobile || "-"}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">GST No</p>
                    <div className="bg-slate-200/50 px-3 py-1 rounded-lg text-sm font-semibold text-slate-700 inline-block border border-slate-200/60">
                      {client.gst_no || "N/A"}
                    </div>
                  </div>
                </div>

                {/* Bottom block */}
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Address</p>
                  <p className="text-[15px] font-medium text-slate-600">{client.address || "No address provided"}</p>
                </div>
              </div>

              {/* Right Section */}
              <div className="w-[140px] shrink-0 border-l border-slate-100 pl-5 flex flex-col justify-center gap-3 relative z-10">
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-md shadow-orange-500/20 font-bold h-11"
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
