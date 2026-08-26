"use client";

import React, { useState } from "react";
import { Holiday } from "@/services/holiday.service";
import { HolidayFormDialog } from "./HolidayFormDialog";
import { Button } from "@/components/ui/button";
import { deleteHolidayAction } from "@/actions/holiday.actions";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Edit2, Trash2 } from "lucide-react";

interface HolidayListProps {
  initialHolidays: Holiday[];
  branches: { id: string; name: string }[];
  canAdd: boolean;
  canEditDelete: boolean;
  isSuperAdmin: boolean;
  isHR: boolean;
  isBranchManager: boolean;
}

export function HolidayList({ initialHolidays, branches, canAdd, canEditDelete, isSuperAdmin, isHR, isBranchManager }: HolidayListProps) {
  const [holidays, setHolidays] = useState<Holiday[]>(initialHolidays);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | undefined>();
  const { toast } = useToast();

  const handleAdd = () => {
    setEditingHoliday(undefined);
    setIsDialogOpen(true);
  };

  const handleEdit = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this holiday?")) return;
    
    const result = await deleteHolidayAction(id);
    if (result.success) {
      toast({ title: "Success", description: "Holiday deleted." });
      // In a real app we might rely on router.refresh() from the server action revalidatePath,
      // but if we want instant optimistic update:
      setHolidays(prev => prev.filter(h => h.id !== id));
    } else {
      toast({ title: "Error", description: result.error, variant: "error" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Holiday Calendar</h2>
          <p className="text-sm text-zinc-500">View and manage organizational holidays.</p>
        </div>
        {canAdd && (
          <Button onClick={handleAdd}>
            Add Holiday
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-6 py-4 font-medium">Date</th>
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Scope (Branch)</th>
              <th className="px-6 py-4 font-medium">Scope (Department)</th>
              {canEditDelete && <th className="px-6 py-4 font-medium text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {holidays.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No holidays found.
                </td>
              </tr>
            ) : (
              holidays.map(holiday => (
                <tr key={holiday.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {format(new Date(holiday.date), "MMM dd, yyyy")}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{holiday.name}</p>
                    {holiday.description && <p className="text-xs text-slate-500">{holiday.description}</p>}
                  </td>
                  <td className="px-6 py-4">
                    {holiday.branches?.name || <span className="text-slate-400">All Branches</span>}
                  </td>
                  <td className="px-6 py-4">
                    {holiday.department || <span className="text-slate-400">All Departments</span>}
                  </td>
                  {canEditDelete && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(holiday)}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(holiday.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <HolidayFormDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        holiday={editingHoliday}
        branches={branches}
        isSuperAdmin={isSuperAdmin}
        isHR={isHR}
        isBranchManager={isBranchManager}
        onSuccess={() => {
          // Relies on revalidatePath in Server Action to refresh the page data
          // A full client reload is another way, but server actions should handle it.
          window.location.reload(); 
        }}
      />
    </div>
  );
}
