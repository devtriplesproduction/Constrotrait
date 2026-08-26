"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { submitLeaveAction } from "@/actions/leave.actions";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await submitLeaveAction({
        leave_type: leaveType,
        start_date: startDate,
        end_date: isHalfDay ? startDate : endDate,
        is_half_day: isHalfDay,
        reason,
        // medical_certificate_url would be uploaded to storage here and URL passed, 
        // simplified for brevity.
        medical_certificate_url: undefined 
      });

      if (res.success) {
        toast({ title: "Leave submitted successfully", variant: "success" });
        onSuccess();
      } else {
        toast({ title: "Failed to submit leave", description: res.error, variant: "error" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "An unexpected error occurred", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Leave Type</label>
        <Select value={leaveType} onValueChange={setLeaveType} placeholder="Select type">
          <SelectItem value="Sick Leave">Sick Leave</SelectItem>
          <SelectItem value="Casual Leave">Casual Leave</SelectItem>
          <SelectItem value="Unpaid Leave">Unpaid Leave</SelectItem>
          <SelectItem value="Compensatory Off">Compensatory Off</SelectItem>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <input 
          type="checkbox" 
          id="halfDay" 
          checked={isHalfDay} 
          onChange={(e) => setIsHalfDay(e.target.checked)} 
        />
        <label htmlFor="halfDay" className="text-sm font-medium">Half Day</label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Start Date</label>
          <Input 
            type="date" 
            required 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
          />
        </div>
        {!isHalfDay && (
          <div>
            <label className="block text-sm font-medium">End Date</label>
            <Input 
              type="date" 
              required 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium">Reason</label>
        <textarea 
          required 
          className="w-full border rounded p-2" 
          rows={3} 
          value={reason} 
          onChange={(e) => setReason(e.target.value)} 
        />
      </div>

      {leaveType === "Sick Leave" && (
        <div>
          <label className="block text-sm font-medium">Medical Certificate (Upload via HR/Admin later or here if configured)</label>
          {/* File input omitted for brevity */}
          <p className="text-xs text-gray-500">Note: Sick leave is unpaid until a certificate is verified by HR.</p>
        </div>
      )}

      <div className="flex space-x-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit Leave"}
        </Button>
      </div>
    </form>
  );
}
