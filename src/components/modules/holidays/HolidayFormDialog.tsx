"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HolidayFormData, holidayFormSchema } from "@/lib/validations/holiday";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createHolidayAction, updateHolidayAction } from "@/actions/holiday.actions";
import { useToast } from "@/hooks/use-toast";
import { Holiday } from "@/services/holiday.service";

interface HolidayFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  holiday?: Holiday;
  branches: { id: string; name: string }[];
  onSuccess: () => void;
}

export function HolidayFormDialog({ isOpen, onClose, holiday, branches, onSuccess }: HolidayFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<HolidayFormData>({
    resolver: zodResolver(holidayFormSchema),
    defaultValues: {
      name: holiday?.name || "",
      date: holiday?.date || "",
      description: holiday?.description || "",
      department: holiday?.department || "",
      branch_id: holiday?.branch_id || "",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      reset({
        name: holiday?.name || "",
        date: holiday?.date || "",
        description: holiday?.description || "",
        department: holiday?.department || "",
        branch_id: holiday?.branch_id || "",
      });
    }
  }, [isOpen, holiday, reset]);

  const onSubmit = async (data: HolidayFormData) => {
    setLoading(true);
    try {
      const payload = {
        name: data.name,
        date: data.date,
        description: data.description || null,
        department: data.department || null,
        branch_id: data.branch_id || null,
        is_active: holiday ? holiday.is_active : true
      };

      const result = holiday 
        ? await updateHolidayAction(holiday.id, payload)
        : await createHolidayAction(payload);
        
      if (result.success) {
        toast({
          title: "Success",
          description: `Holiday ${holiday ? "updated" : "created"} successfully.`,
        });
        onSuccess();
        onClose();
      } else {
        toast({
          title: "Error",
          description: result.error || "An error occurred.",
          variant: "error",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md text-left">
      <h2 className="text-xl font-semibold text-zinc-900 mb-6">
        {holiday ? "Edit Holiday" : "Add Holiday"}
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
          <Input {...register("name")} placeholder="Holiday Name" />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Date</label>
          <Input type="date" {...register("date")} />
          {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
          <Input {...register("description")} placeholder="Optional description" />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Branch Scope</label>
          <select 
            {...register("branch_id")}
            className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all duration-200"
          >
            <option value="">All Branches (Requires Department)</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Department Scope</label>
          <select 
            {...register("department")}
            className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all duration-200"
          >
            <option value="">All Departments (Requires Branch)</option>
            <option value="HR">HR</option>
            <option value="Admin">Admin</option>
            <option value="Engineering">Engineering</option>
            <option value="Marketing">Marketing</option>
            <option value="Quality">Quality</option>
            {/* Assuming generic departments for demo, actual project might fetch these dynamically if they were a table, but it's TEXT */}
          </select>
          {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department.message}</p>}
        </div>

        <div className="pt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Holiday"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
