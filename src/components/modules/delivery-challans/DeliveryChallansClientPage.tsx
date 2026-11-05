"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeliveryChallan, StaffMember } from "@/types/delivery-challan";
import { DeliveryChallanList } from "./DeliveryChallanList";
import { DeliveryChallanFormModal } from "./DeliveryChallanFormModal";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/Dropdown";
import { PageHeader } from "@/components/modules/PageHeader";
import {
  Plus,
  Truck,
  Search,
  X,
  Filter,
  Layers,
  CheckCircle2,
  FileCheck2,
  FlaskConical,
  PackageCheck
} from "lucide-react";

interface DeliveryChallansClientPageProps {
  challans: DeliveryChallan[];
  canManage: boolean;
  userProfile?: {
    first_name: string;
    last_name: string;
    designation?: string;
  };
  clients?: Array<{
    id: string;
    name: string;
    company_name: string | null;
    project_name: string | null;
    site_name: string | null;
    contact_person: string | null;
    mobile: string | null;
    agency_name: string | null;
  }>;
  staff?: StaffMember[];
}

export function DeliveryChallansClientPage({
  challans,
  canManage,
  userProfile,
  clients = [],
  staff = [],
}: DeliveryChallansClientPageProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [purposeFilter, setPurposeFilter] = useState("all");

  // KPI Metrics
  const totalChallans = challans.length;
  const customerHandoverCount = challans.filter(
    (c) => c.purpose_of_handover === "Customer Material Handover"
  ).length;
  const takenForTestingCount = challans.filter(
    (c) => c.purpose_of_handover === "Material Taken for Testing"
  ).length;
  const collectedFromLabCount = challans.filter(
    (c) =>
      c.purpose_of_handover === "Material Collected from Lab" ||
      c.purpose_of_handover === "Other"
  ).length;

  const hasFiltersActive = searchQuery.trim().length > 0 || purposeFilter !== "all";

  // Filtered List
  const filteredChallans = useMemo(() => {
    return challans.filter((c) => {
      if (purposeFilter !== "all") {
        if (purposeFilter === "Other") {
          const isStandard = [
            "Customer Material Handover",
            "Material Taken for Testing",
            "Material Collected from Lab",
          ].includes(c.purpose_of_handover);
          if (isStandard) return false;
        } else if (c.purpose_of_handover !== purposeFilter) {
          return false;
        }
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const itemsMatch = c.items?.some(
        (it) =>
          it.material_description.toLowerCase().includes(q) ||
          it.remarks?.toLowerCase().includes(q)
      );

      return (
        c.challan_no?.toLowerCase().includes(q) ||
        c.customer_name?.toLowerCase().includes(q) ||
        c.project_site_name?.toLowerCase().includes(q) ||
        c.material_taken_by?.toLowerCase().includes(q) ||
        c.company_agency_name?.toLowerCase().includes(q) ||
        c.mobile_no?.toLowerCase().includes(q) ||
        c.issued_by_name?.toLowerCase().includes(q) ||
        itemsMatch
      );
    });
  }, [challans, purposeFilter, searchQuery]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setPurposeFilter("all");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Delivery Challan"
        subtitle="Generate, record, and print official material delivery challans for site handover, testing, or lab collections."
        icon={Truck}
        actions={
          <Button
            onClick={() => setIsFormOpen(true)}
            className="rounded-2xl bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all hover:-translate-y-0.5 h-11 px-5 font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Delivery Challan</span>
          </Button>
        }
      />

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Challans */}
        <div className="bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-xl px-3.5 py-2.5 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Challans
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              {totalChallans}
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              All-time records
            </span>
          </div>
        </div>

        {/* Customer Handover */}
        <div className="bg-white/90 backdrop-blur-sm border border-blue-200/80 rounded-xl px-3.5 py-2.5 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Customer Handover
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-200/60">
              <PackageCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-bold text-blue-700 tracking-tight">
              {customerHandoverCount}
            </span>
            <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/50">
              Site handovers
            </span>
          </div>
        </div>

        {/* Taken for Testing */}
        <div className="bg-white/90 backdrop-blur-sm border border-amber-200/80 rounded-xl px-3.5 py-2.5 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Taken for Testing
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-200/60">
              <FlaskConical className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-bold text-amber-700 tracking-tight">
              {takenForTestingCount}
            </span>
            <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/50">
              Lab testing
            </span>
          </div>
        </div>

        {/* Collected from Lab / Other */}
        <div className="bg-white/90 backdrop-blur-sm border border-emerald-200/80 rounded-xl px-3.5 py-2.5 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Lab Collections &amp; Other
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200/60">
              <FileCheck2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-bold text-emerald-700 tracking-tight">
              {collectedFromLabCount}
            </span>
            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
              Dispatch &amp; other
            </span>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by challan #, customer, person, material..."
            className="w-full text-xs h-10 pl-9 pr-8 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium hidden sm:inline">Purpose:</span>
          </div>
          <div className="w-56 sm:w-60">
            <Dropdown
              className="w-full space-y-0"
              value={purposeFilter}
              onChange={(val) => setPurposeFilter(val)}
              placeholder={
                <span className="flex items-center gap-1.5 font-semibold text-slate-700 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                  <span>All Purposes</span>
                </span>
              }
              options={[
                {
                  value: "all",
                  label: (
                    <span className="flex items-center gap-2 text-slate-700 font-medium text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span>All Purposes</span>
                      <span className="text-[10px] text-slate-400 font-mono">({challans.length})</span>
                    </span>
                  ),
                },
                {
                  value: "Customer Material Handover",
                  label: (
                    <span className="flex items-center gap-2 text-sky-700 font-medium text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                      <span>Customer Material Handover</span>
                      <span className="text-[10px] text-sky-600 font-mono">({customerHandoverCount})</span>
                    </span>
                  ),
                },
                {
                  value: "Material Taken for Testing",
                  label: (
                    <span className="flex items-center gap-2 text-amber-700 font-medium text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span>Material Taken for Testing</span>
                      <span className="text-[10px] text-amber-600 font-mono">({takenForTestingCount})</span>
                    </span>
                  ),
                },
                {
                  value: "Material Collected from Lab",
                  label: (
                    <span className="flex items-center gap-2 text-emerald-700 font-medium text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>Material Collected from Lab</span>
                      <span className="text-[10px] text-emerald-600 font-mono">({collectedFromLabCount})</span>
                    </span>
                  ),
                },
                {
                  value: "Other",
                  label: (
                    <span className="flex items-center gap-2 text-purple-700 font-medium text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                      <span>Other</span>
                    </span>
                  ),
                },
              ]}
              align="right"
              menuWidth={250}
              buttonClassName="h-10 px-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all text-slate-700 cursor-pointer text-xs font-semibold"
            />
          </div>

          {hasFiltersActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs text-slate-500 hover:text-slate-900 h-10 px-3 rounded-xl"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Challans List */}
      <DeliveryChallanList
        challans={filteredChallans}
        canManage={canManage}
        onOpenNewChallan={() => setIsFormOpen(true)}
        hasFiltersActive={hasFiltersActive}
        onResetFilters={handleResetFilters}
      />

      {/* Creation Modal */}
      <DeliveryChallanFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        userProfile={userProfile}
        clients={clients}
        staff={staff}
      />
    </div>
  );
}
