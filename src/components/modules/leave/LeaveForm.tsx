"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { submitLeaveAction } from "@/actions/leave.actions";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Calendar, FileText, Stethoscope, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { PremiumDatePicker } from "@/components/ui/PremiumDatePicker";

interface LeaveFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function LeaveForm({ onSuccess, onCancel }: LeaveFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [leaveType, setLeaveType] = useState<string>("Sick Leave");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [reason, setReason] = useState("");
  const [medicalCertificate, setMedicalCertificate] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let certificateUrl = undefined;
      const supabase = createClient();

      if (leaveType === "Sick Leave" && medicalCertificate) {
        const fileExt = medicalCertificate.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `public/${fileName}`;

        const { data, error } = await supabase.storage
          .from('medical-certificates')
          .upload(filePath, medicalCertificate);

        if (error) {
          throw new Error("Failed to upload medical certificate: " + error.message);
        }

        if (data) {
          const { data: publicUrlData } = supabase.storage
            .from('medical-certificates')
            .getPublicUrl(filePath);
          
          certificateUrl = publicUrlData.publicUrl;
        }
      }

      const res = await submitLeaveAction({
        leave_type: leaveType,
        start_date: startDate,
        end_date: isHalfDay ? startDate : endDate,
        is_half_day: isHalfDay,
        reason,
        medical_certificate_url: certificateUrl 
      });

      if (res.success) {
        toast({ title: "Leave submitted successfully", variant: "success" });
        onSuccess();
      } else {
        toast({ title: "Failed to submit leave", description: res.error, variant: "error" });
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err.message || "An unexpected error occurred", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-500" /> Leave Type
          </label>
          <Select value={leaveType} onValueChange={setLeaveType} placeholder="Select type">
            <SelectItem value="Sick Leave">Sick Leave</SelectItem>
            <SelectItem value="Casual Leave">Casual Leave</SelectItem>
            <SelectItem value="Unpaid Leave">Unpaid Leave</SelectItem>
            <SelectItem value="Compensatory Off">Compensatory Off</SelectItem>
          </Select>
        </div>

        <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100 flex items-center justify-between transition-colors hover:bg-slate-50">
          <div>
            <label htmlFor="halfDay" className="text-sm font-semibold text-slate-700 cursor-pointer block">Half Day Request</label>
            <p className="text-xs text-slate-500 mt-0.5">Applies for a single day only</p>
          </div>
          <label htmlFor="halfDay" className="relative inline-block w-11 h-6 align-middle select-none cursor-pointer">
            <input 
              type="checkbox" 
              id="halfDay" 
              className="peer sr-only"
              checked={isHalfDay} 
              onChange={(e) => setIsHalfDay(e.target.checked)} 
            />
            <div className="block bg-slate-200 w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500/50 transition-colors peer-checked:bg-orange-600"></div>
            <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></div>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" /> Start Date
            </label>
            <PremiumDatePicker 
              value={startDate} 
              onChange={(date) => setStartDate(date)}
            />
          </div>
          
          <div className={cn("grid gap-2 transition-all duration-300", isHalfDay ? "opacity-50 pointer-events-none" : "opacity-100")}>
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" /> End Date
            </label>
            <PremiumDatePicker 
              value={endDate} 
              onChange={(date) => setEndDate(date)} 
              disabled={isHalfDay}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-semibold text-slate-700">Reason</label>
          <textarea 
            required 
            placeholder="Briefly explain your reason for leave..."
            className="w-full border border-slate-200 bg-white rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all resize-none min-h-[100px]" 
            value={reason} 
            onChange={(e) => setReason(e.target.value)} 
          />
        </div>

        {leaveType === "Sick Leave" && (
          <div className="grid gap-2 p-4 rounded-xl border border-orange-100 bg-orange-50/30">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-orange-500" /> Medical Certificate
            </label>
            <div className="relative group">
              <input 
                type="file" 
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setMedicalCertificate(e.target.files?.[0] || null)} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="border-2 border-dashed border-orange-200 bg-white rounded-lg p-4 flex flex-col items-center justify-center gap-2 text-center group-hover:border-orange-400 transition-colors">
                <UploadCloud className="w-6 h-6 text-orange-400 group-hover:text-orange-500 transition-colors" />
                <div className="text-sm text-slate-600">
                  {medicalCertificate ? (
                    <span className="font-medium text-orange-600">{medicalCertificate.name}</span>
                  ) : (
                    <span><span className="font-semibold text-orange-600">Click to upload</span> or drag and drop</span>
                  )}
                </div>
                <div className="text-xs text-slate-400">PDF, JPG, PNG up to 5MB</div>
              </div>
            </div>
            <p className="text-xs text-orange-600/80 mt-1 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-orange-500 block"></span>
              Sick leave is unpaid until a certificate is verified
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-4 border-t border-slate-100">
        <Button type="button" variant="ghost" className="hover:bg-slate-100" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700 shadow-sm shadow-orange-600/20 px-8">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : "Submit Application"}
        </Button>
      </div>
    </form>
  );
}
