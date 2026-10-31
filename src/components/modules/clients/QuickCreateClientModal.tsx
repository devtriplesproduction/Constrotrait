"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Building,
  User,
  Phone,
  Mail,
  FileSpreadsheet,
  MapPin,
  Briefcase,
  AlertCircle,
  Loader2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createClientAction } from "@/actions/accounting.actions";

interface QuickCreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (client: any, project?: any) => void;
  defaultBranchId?: string;
}

export function QuickCreateClientModal({
  isOpen,
  onClose,
  onSuccess,
  defaultBranchId,
}: QuickCreateClientModalProps) {
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    mobile: "",
    email: "",
    gst_no: "",
    address: "",
    site_name: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: "",
        contact_person: "",
        mobile: "",
        email: "",
        gst_no: "",
        address: "",
        site_name: "",
      });
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const clientName = formData.name.trim();
    if (!clientName) {
      setErrorMsg("Client / Organization Name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createClientAction({
        name: clientName,
        company_name: clientName,
        contact_person: formData.contact_person.trim() || undefined,
        mobile: formData.mobile.trim() || undefined,
        email: formData.email.trim() || undefined,
        gst_no: formData.gst_no.trim() || undefined,
        address: formData.address.trim() || undefined,
        site_name: formData.site_name.trim() || undefined,
        project_name: formData.site_name.trim() || undefined,
        branch_id: defaultBranchId,
      });

      if (!res.success || !res.data) {
        setErrorMsg(res.error || "Failed to create client.");
        setIsSubmitting(false);
        return;
      }

      toast({
        title: "Client Created Successfully",
        description: `"${clientName}" has been added and selected.`,
      });

      onSuccess(res.data.client, res.data.project);
      onClose();
    } catch (err: any) {
      console.error("Quick create client error:", err);
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all";

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl shadow-xs">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Create New Client</h2>
              <p className="text-[11px] text-slate-500">
                Register a new corporate client organization and optional site
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-800 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Client Name (Required) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-blue-600" />
              Client / Organization Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              className={inputCls}
              placeholder="e.g. Larsen & Toubro Construction Ltd."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Contact Person */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Contact Person
              </label>
              <input
                type="text"
                className={inputCls}
                placeholder="e.g. Rajesh Sharma"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              />
            </div>

            {/* Mobile / Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                Phone / Mobile
              </label>
              <input
                type="tel"
                className={inputCls}
                placeholder="e.g. +91 98765 43210"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                Email Address
              </label>
              <input
                type="email"
                className={inputCls}
                placeholder="e.g. accounts@client.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {/* GST Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                GST Number (GSTIN)
              </label>
              <input
                type="text"
                className={inputCls}
                placeholder="e.g. 27AAAAA0000A1Z5"
                maxLength={15}
                value={formData.gst_no}
                onChange={(e) => setFormData({ ...formData, gst_no: e.target.value.toUpperCase() })}
              />
            </div>
          </div>

          {/* Project / Site Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-slate-500" />
              Project / Construction Site Name
            </label>
            <input
              type="text"
              className={inputCls}
              placeholder="e.g. Metro Rail Pier Construction - Site A"
              value={formData.site_name}
              onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Optional. If provided, this project will automatically be created and pre-selected in the proposal.
            </p>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              Office / Billing Address
            </label>
            <textarea
              rows={2}
              className={`${inputCls} resize-none`}
              placeholder="e.g. Plot No. 42, Sector 18, Phase 2, Industrial Area..."
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={onClose}
              className="text-xs h-9 px-4 rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              size="sm"
              className="text-xs h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Client</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
