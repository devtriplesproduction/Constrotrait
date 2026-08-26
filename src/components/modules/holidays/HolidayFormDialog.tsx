"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HolidayFormData, holidayFormSchema } from "@/lib/validations/holiday";
import { Modal } from "@/components/common/Modal";
import { DEPARTMENTS } from "@/config/departments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createHolidayAction, updateHolidayAction } from "@/actions/holiday.actions";
import { useToast } from "@/hooks/use-toast";
import { Holiday } from "@/services/holiday.service";
import { FormMultiSelect } from "@/components/forms/FormMultiSelect";
import { FormSelect } from "@/components/forms/FormSelect";
import { PremiumDatePicker } from "@/components/ui/PremiumDatePicker";
import { Controller } from "react-hook-form";

interface HolidayFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  holiday?: Holiday;
  branches: { id: string; name: string }[];
  isSuperAdmin: boolean;
  isHR: boolean;

  onSuccess: () => void;
}

export function HolidayFormDialog({ isOpen, onClose, holiday, branches, isSuperAdmin, isHR, onSuccess }: HolidayFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<HolidayFormData>({
    resolver: zodResolver(holidayFormSchema),
    defaultValues: {
      name: holiday?.name || "",
      date: holiday?.date || "",
      description: holiday?.description || "",
      departments: holiday?.department ? holiday.department.split(',') : [],
      branch_id: holiday?.branch_id || "",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      reset({
        name: holiday?.name || "",
        date: holiday?.date || "",
        description: holiday?.description || "",
        departments: holiday?.department ? holiday.department.split(',') : [],
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
        department: data.departments && data.departments.length > 0 ? data.departments.join(',') : null,
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
          <Controller
            control={control as any}
            name="date"
            render={({ field }) => (
              <PremiumDatePicker
                value={field.value}
                onChange={field.onChange}
                side="right"
              />
            )}
          />
          {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
          <Input {...register("description")} placeholder="Optional description" />
        </div>

        {isSuperAdmin && (
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Branch Scope</label>
            <FormSelect
              name="branch_id"
              control={control as any}
              options={[
                { value: "", label: "All Branches (Requires Department)" },
                ...branches.map((b) => ({ value: b.id, label: b.name })),
              ]}
              placeholder="Select Branch"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Department Scope</label>
          <FormMultiSelect
            name="departments"
            control={control as any}
            options={DEPARTMENTS.map(dept => ({ label: dept.name, value: dept.id }))}
            placeholder={isHR && !isSuperAdmin ? "Select Departments (Required)" : "All Departments (Requires Branch)"}
          />
          {errors.departments && <p className="text-red-500 text-xs mt-1">{errors.departments.message}</p>}
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
