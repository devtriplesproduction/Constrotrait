"use client";

import React, { useTransition } from "react";
import { X, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { branchSchema, BranchFormData } from "@/lib/validations/branch";
import { useToast } from "@/hooks/use-toast";
import { createBranchAction, updateBranchAction } from "@/actions/branch.actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface BranchFormModalProps {
  branch?: (BranchFormData & { id: string }) | null;
  onClose: () => void;
}

export function BranchFormModal({ branch, onClose }: BranchFormModalProps) {
  const isEditing = !!branch;
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: branch?.name || "",
      code: branch?.code || "",
      address: branch?.address || "",
      is_active: branch?.is_active ?? true,
    },
  });

  const onSubmit = (data: BranchFormData) => {
    startTransition(async () => {
      let result;
      if (isEditing) {
        result = await updateBranchAction(branch.id, data);
      } else {
        result = await createBranchAction(data);
      }

      if (result.success) {
        toast({
          title: ("message" in result ? result.message : null) || `Branch ${isEditing ? "updated" : "created"} successfully.`,
          variant: "success",
        });
        onClose();
      } else {
        toast({
          title: ("error" in result ? result.error : null) || `Failed to ${isEditing ? "update" : "create"} branch.`,
          variant: "error",
        });
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {isEditing ? "Edit Branch" : "Add New Branch"}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {isEditing ? "Update branch details" : "Create a new branch in the organization"}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-xl" disabled={isPending}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <div className="p-6">
          <form id="branch-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Branch Name *</label>
              <Input
                {...register("name")}
                placeholder="e.g. Headquarters"
                className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-medium text-slate-700 outline-none ${
                  errors.name ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                }`}
                disabled={isPending}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Branch Code *</label>
              <Input
                {...register("code")}
                placeholder="e.g. HQ-01"
                className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-medium text-slate-700 outline-none ${
                  errors.code ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                }`}
                disabled={isPending}
              />
              {errors.code && <p className="text-xs text-red-500">{errors.code.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Address</label>
              <textarea
                {...register("address")}
                placeholder="Full branch address"
                rows={3}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-none"
                disabled={isPending}
              />
              {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
            </div>
            
            {isEditing && (
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="is_active" 
                  {...register("is_active")}
                  className="w-4 h-4 text-orange-500 border-slate-300 rounded focus:ring-orange-500"
                  disabled={isPending}
                />
                <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                  Branch is active
                </label>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isPending} className="px-6 rounded-xl font-bold">
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="branch-form" 
            disabled={isPending}
            className="flex items-center gap-2 px-6 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-md transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isPending ? "Saving..." : "Save Branch"}
          </Button>
        </div>
      </div>
    </div>
  );
}
