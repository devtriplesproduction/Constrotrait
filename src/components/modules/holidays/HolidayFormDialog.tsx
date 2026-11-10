"use client";

import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { PremiumDatePicker } from "@/components/ui/PremiumDatePicker";
import { getDatesInRange } from "@/lib/holiday-utils";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils/cn";

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
  const [isRange, setIsRange] = useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, control, formState: { errors }, reset, watch, setValue } = useForm<HolidayFormData>({
    resolver: zodResolver(holidayFormSchema),
    defaultValues: {
      name: holiday?.name || "",
      isRange: false,
      date: holiday?.date || "",
      endDate: holiday?.date || "",
      description: holiday?.description || "",
      departments: holiday ? (holiday.department && holiday.department !== 'ALL' ? holiday.department.split(',') : ["all"]) : [],
      branches: holiday ? (holiday.branch_id ? [holiday.branch_id] : ["all"]) : [],
    },
  });

  const watchedDate = watch("date");
  const watchedEndDate = watch("endDate");

  const consecutiveDays = React.useMemo(() => {
    if (!isRange || !watchedDate || !watchedEndDate || watchedEndDate < watchedDate) {
      return 0;
    }
    return getDatesInRange(watchedDate, watchedEndDate).length;
  }, [isRange, watchedDate, watchedEndDate]);

  React.useEffect(() => {
    if (isOpen) {
      setIsRange(false);
      reset({
        name: holiday?.name || "",
        isRange: false,
        date: holiday?.date || "",
        endDate: holiday?.date || "",
        description: holiday?.description || "",
        departments: holiday ? (holiday.department && holiday.department !== 'ALL' ? holiday.department.split(',') : ["all"]) : [],
        branches: holiday ? (holiday.branch_id ? [holiday.branch_id] : ["all"]) : [],
      });
    }
  }, [isOpen, holiday, reset]);

  const onSubmit = async (data: HolidayFormData) => {
    setLoading(true);
    try {
      const isAllDepts = data.departments?.includes("all");
      const finalDepartments = isAllDepts ? [] : data.departments;

      const isAllBranches = data.branches?.includes("all");
      const finalBranches = isAllBranches ? [] : data.branches;

      const payload = {
        name: data.name,
        date: data.date,
        endDate: isRange ? data.endDate : undefined,
        isRange,
        description: data.description || null,
        department: finalDepartments && finalDepartments.length > 0 ? finalDepartments.join(',') : 'ALL',
        branch_id: finalBranches && finalBranches.length > 0 ? finalBranches[0] : null,
        branches: finalBranches,
        is_active: holiday ? holiday.is_active : true
      };

      const result = holiday
        ? await updateHolidayAction(holiday.id, payload)
        : await createHolidayAction(payload);

      if (result.success) {
        const count = (result as { count?: number }).count || consecutiveDays || 1;
        toast({
          title: "Success",
          description: holiday
            ? "Holiday updated successfully."
            : count > 1
            ? `${count} consecutive holidays scheduled successfully.`
            : "Holiday created successfully.",
        });
        onSuccess();
        onClose();
      } else {
        toast({
          title: "Error",
          description: (result as { error?: string }).error || "An error occurred.",
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
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md sm:max-w-lg text-left">
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
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-zinc-700">
              {isRange ? "Holiday Date Range" : "Date"}
            </label>
            {!holiday && (
              <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setIsRange(false);
                    setValue("isRange", false);
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all cursor-pointer select-none",
                    !isRange
                      ? "bg-white text-orange-600 shadow-xs font-semibold"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Single Day
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRange(true);
                    setValue("isRange", true);
                    if (!watchedEndDate && watchedDate) {
                      setValue("endDate", watchedDate);
                    }
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all cursor-pointer select-none",
                    isRange
                      ? "bg-white text-orange-600 shadow-xs font-semibold"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Date Range
                </button>
              </div>
            )}
          </div>

          {!isRange ? (
            <div>
              <Controller
                control={control}
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
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Start Date</label>
                  <Controller
                    control={control}
                    name="date"
                    render={({ field }) => (
                      <PremiumDatePicker
                        value={field.value}
                        onChange={(d) => {
                          field.onChange(d);
                          if (watchedEndDate && d > watchedEndDate) {
                            setValue("endDate", d);
                          }
                        }}
                        displayFormat="MMM d, yyyy"
                        side="bottom"
                        align="left"
                      />
                    )}
                  />
                  {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">End Date</label>
                  <Controller
                    control={control}
                    name="endDate"
                    render={({ field }) => (
                      <PremiumDatePicker
                        value={field.value}
                        onChange={field.onChange}
                        minDate={watchedDate || undefined}
                        displayFormat="MMM d, yyyy"
                        side="bottom"
                        align="right"
                      />
                    )}
                  />
                  {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate.message}</p>}
                </div>
              </div>

              {consecutiveDays > 0 && watchedDate && watchedEndDate && (
                <div className="flex items-center gap-2 p-2.5 bg-orange-50/80 border border-orange-200/60 rounded-xl text-xs text-orange-800">
                  <Calendar className="w-4 h-4 text-orange-600 shrink-0" />
                  <span>
                    <strong className="font-semibold">
                      {consecutiveDays} consecutive {consecutiveDays === 1 ? "day" : "days"}
                    </strong>{" "}
                    scheduled as holidays (
                    {format(new Date(`${watchedDate}T12:00:00`), "MMM d")} -{" "}
                    {format(new Date(`${watchedEndDate}T12:00:00`), "MMM d, yyyy")})
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
          <Input {...register("description")} placeholder="Optional description" />
        </div>

        {isSuperAdmin && (
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Branch Scope</label>
            <FormMultiSelect
              name="branches"
              control={control}
              options={[
                { value: "all", label: "All Branches (Requires Department)" },
                ...branches.map((b) => ({ value: b.id, label: b.name })),
              ]}
              placeholder="Select Branches"
            />
            {errors.branches && <p className="text-red-500 text-xs mt-1">{errors.branches.message}</p>}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Department Scope</label>
          <FormMultiSelect
            name="departments"
            control={control}
            options={[
              { label: "All Departments", value: "all" },
              ...DEPARTMENTS.map(dept => ({ label: dept.name, value: dept.id }))
            ]}
            placeholder={isHR && !isSuperAdmin ? "Select Departments (Required)" : "All Departments (Requires Branch)"}
          />
          {errors.departments && <p className="text-red-500 text-xs mt-1">{errors.departments.message}</p>}
        </div>

        <div className="pt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading
              ? "Saving..."
              : isRange && consecutiveDays > 1
              ? `Save Holidays (${consecutiveDays} Days)`
              : "Save Holiday"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
