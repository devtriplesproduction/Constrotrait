"use client";

import React, { useState, useTransition } from "react";
import { Building2, Edit2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toggleBranchActiveAction } from "@/actions/branch.actions";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { BranchFormModal } from "./BranchFormModal";
import { Database } from "@/types/database";
import { BranchFormData } from "@/lib/validations/branch";

type BranchRow = Database["public"]["Tables"]["branches"]["Row"];

interface BranchTableProps {
  branches: BranchRow[];
}

export function BranchTable({ branches }: BranchTableProps) {
  const [selectedBranch, setSelectedBranch] = useState<(BranchFormData & { id: string }) | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleToggleStatus = (id: string, currentStatus: boolean | null) => {
    startTransition(async () => {
      const newStatus = !currentStatus;
      const res = await toggleBranchActiveAction(id, newStatus);
      if (res.success) {
        toast({ title: "message" in res ? res.message : "Branch status updated.", variant: "success" });
      } else {
        toast({ title: res.error || "Failed to update branch status.", variant: "error" });
      }
    });
  };

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-300">
      <div className="w-full overflow-hidden bg-white rounded-3xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Branch Details</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Address</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branches.map((branch) => (
                <tr key={branch.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{branch.name}</p>
                        <p className="text-xs text-slate-500">{branch.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600 max-w-[200px] truncate" title={branch.address || "N/A"}>
                      {branch.address || "-"}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={branch.is_active ? "Active" : "Inactive"} isActive={branch.is_active} />
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600">
                      {new Date(branch.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => setSelectedBranch({
                          id: branch.id,
                          name: branch.name,
                          code: branch.code,
                          address: branch.address || undefined,
                          is_active: branch.is_active ?? true,
                        })}
                        className="text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl"
                        title="Edit Branch"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(branch.id, branch.is_active)}
                        disabled={isPending}
                        className={`rounded-xl ${
                          branch.is_active
                            ? "text-slate-400 hover:text-red-600 hover:bg-red-50"
                            : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                        }`}
                        title={branch.is_active ? "Deactivate Branch" : "Activate Branch"}
                      >
                        {branch.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedBranch && (
        <BranchFormModal
          branch={selectedBranch}
          onClose={() => setSelectedBranch(null)}
        />
      )}
    </div>
  );
}
