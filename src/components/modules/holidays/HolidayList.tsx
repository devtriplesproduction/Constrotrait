"use client";

import React, { useState } from "react";
import { Holiday } from "@/services/holiday.service";
import { HolidayFormDialog } from "./HolidayFormDialog";
import { Button } from "@/components/ui/button";
import { deleteHolidayAction } from "@/actions/holiday.actions";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Edit2, Plus, Trash2, Calendar } from "lucide-react";
import { DEPARTMENTS } from "@/config/departments";
import { PageHeader } from "@/components/modules/PageHeader";

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
      <PageHeader
        title="Holiday Calendar"
        subtitle="View and manage organizational holidays."
        icon={Calendar}
        actions={
          canAdd && (
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" /> Add Holiday
            </Button>
          )
        }
      />

      {holidays.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white/40 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="w-20 h-20 bg-orange-100/50 rounded-full flex items-center justify-center mb-6">
            <Calendar className="w-10 h-10 text-orange-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No Holidays Found</h3>
          <p className="text-slate-500 text-center max-w-sm">
            There are no holidays scheduled yet. Click the Add Holiday button to create one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {holidays.map((holiday, idx) => (
            <div 
              key={holiday.id} 
              className="group relative bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(249,115,22,0.12)] rounded-3xl p-6 transition-all duration-500 hover:-translate-y-1 overflow-hidden"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-400/20 to-transparent rounded-bl-full -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-110" />
              
              <div className="relative z-10 flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/40 transition-shadow">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-90">{format(new Date(holiday.date), "MMM")}</span>
                    <span className="text-xl font-black leading-none mt-0.5">{format(new Date(holiday.date), "dd")}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-orange-600 transition-colors">{holiday.name}</h3>
                    <p className="text-sm font-medium text-slate-500">{format(new Date(holiday.date), "EEEE, yyyy")}</p>
                  </div>
                </div>

                {canEditDelete && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(holiday)}
                      className="h-8 w-8 rounded-full bg-white text-slate-400 hover:text-orange-600 hover:bg-orange-50 shadow-sm"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(holiday.id)}
                      className="h-8 w-8 rounded-full bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {holiday.description && (
                <p className="text-sm text-slate-600 mb-6 line-clamp-2 relative z-10">
                  {holiday.description}
                </p>
              )}

              <div className="space-y-3 relative z-10">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Branch Scope</span>
                  <div className="flex flex-wrap gap-2">
                    {holiday.branches?.name ? (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50/80 text-blue-700 border border-blue-100/50">
                        {holiday.branches.name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100/80 text-slate-600 border border-slate-200/50">
                        All Branches
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Department Scope</span>
                  <div className="flex flex-wrap gap-2">
                    {holiday.department ? (
                      holiday.department.split(',').map((id, index) => {
                        const dept = DEPARTMENTS.find(d => d.id === id.trim());
                        const deptName = dept ? dept.name : id.trim();
                        return (
                          <span key={index} className="inline-flex items-center px-3 py-1.5 rounded-xl text-[11px] font-bold bg-orange-50/80 text-orange-700 border border-orange-100/50 transition-colors hover:bg-orange-100">
                            {deptName}
                          </span>
                        );
                      })
                    ) : (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100/80 text-slate-600 border border-slate-200/50">
                        All Departments
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <HolidayFormDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        holiday={editingHoliday}
        branches={branches}
        isSuperAdmin={isSuperAdmin}
        isHR={isHR}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}
