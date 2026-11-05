"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createApplication } from "@/actions/employee-application.actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { PrintableApplication } from "./PrintableApplication";
import { PremiumDatePicker } from "@/components/ui/PremiumDatePicker";
import { Calendar, FileText, CheckSquare, MessageSquare, ArrowRight, ArrowLeft, Send, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ApplicationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: {
    first_name: string;
    last_name: string;
    designation: string;
    department: string;
  };
}

export function ApplicationFormModal({ isOpen, onClose, userProfile }: ApplicationFormModalProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [subject, setSubject] = useState("");
  const [approvalFor, setApprovalFor] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 1) {
      setStep(2);
      return;
    }

    setLoading(true);
    
    try {
      const res = await createApplication({
        application_date: date,
        subject,
        approval_for: approvalFor,
        reason
      });

      if (res.success) {
        toast({ title: "Application submitted successfully" });
        // Reset state
        setStep(1);
        setDate(format(new Date(), "yyyy-MM-dd"));
        setSubject("");
        setApprovalFor("");
        setReason("");
        onClose();
        router.refresh();
      } else {
        toast({ title: "Error submitting application", description: res.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    onClose();
  };

  if (!isOpen) return null;

  const previewApp: any = {
    application_date: date,
    subject: subject,
    approval_for: approvalFor,
    reason: reason,
    status: "pending"
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={cn(
        "bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-h-[92vh] flex flex-col overflow-hidden transition-all duration-300",
        step === 1 ? "max-w-3xl" : "max-w-4xl"
      )}>
        <div className="p-5 border-b flex justify-between items-center shrink-0 bg-white/95 backdrop-blur-md z-10 rounded-t-3xl">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              {step === 1 ? "New Application" : "Preview Application"}
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              {step === 1 ? "Fill in the details for your application" : "Review your application before submitting"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 font-semibold text-slate-600 text-sm">
              {step}/2
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-9 h-9 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
            {step === 1 ? (
              <div className="space-y-5 p-2">
                <div>
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide mb-1.5 block">
                    <Calendar className="w-4 h-4 inline-block mr-1 text-primary" /> Date
                  </label>
                  <PremiumDatePicker 
                    value={date} 
                    onChange={(newDate) => setDate(newDate)}
                    className="w-full"
                  />
                </div>
                
                <div className="w-full space-y-1.5">
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wide mb-1.5">
                    <FileText className="w-4 h-4 inline-block mr-1 text-primary" /> Subject: Application for
                  </label>
                  <textarea 
                    value={subject} 
                    onChange={(e) => setSubject(e.target.value)}
                    className="flex w-full min-h-[60px] rounded-xl border border-border bg-background px-4 py-2.5 text-sm shadow-sm transition-all duration-300 placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary hover:border-primary/50 text-foreground resize-none [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200/80 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300/80"
                    placeholder="e.g. Leave, Salary Advance..."
                    required 
                  />
                </div>

                <div className="w-full space-y-1.5">
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wide mb-1.5">
                    <CheckSquare className="w-4 h-4 inline-block mr-1 text-primary" /> I would like to request your approval for
                  </label>
                  <textarea 
                    value={approvalFor} 
                    onChange={(e) => setApprovalFor(e.target.value)}
                    className="flex w-full min-h-[80px] rounded-xl border border-border bg-background px-4 py-2.5 text-sm shadow-sm transition-all duration-300 placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary hover:border-primary/50 text-foreground resize-none [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200/80 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300/80"
                    placeholder="e.g. 2 days of casual leave from 12th Oct to 13th Oct"
                    required 
                  />
                </div>

                <div className="w-full space-y-1.5">
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wide mb-1.5">
                    <MessageSquare className="w-4 h-4 inline-block mr-1 text-primary" /> The reason for this request is
                  </label>
                  <textarea 
                    value={reason} 
                    onChange={(e) => setReason(e.target.value)}
                    className="flex w-full min-h-[100px] rounded-xl border border-border bg-background px-4 py-2.5 text-sm shadow-sm transition-all duration-300 placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary hover:border-primary/50 text-foreground resize-none [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200/80 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300/80"
                    placeholder="Provide detailed reasoning here..."
                    required 
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white">
                <PrintableApplication application={previewApp} userProfile={userProfile} />
              </div>
            )}
          </div>

          <div className="shrink-0 flex justify-between items-center p-4 border-t bg-slate-50/80 rounded-b-3xl">
            {step === 1 ? (
              <div /> // Spacer
            ) : (
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="shadow-sm">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Edit
              </Button>
            )}
            
            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              {step === 1 ? (
                <Button type="submit" disabled={loading} className="shadow-sm font-medium">
                  Preview Application <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={loading} className="shadow-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground">
                  {loading ? "Submitting..." : (
                    <>Submit Application <Send className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
