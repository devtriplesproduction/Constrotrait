"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertCircle, Calendar, ArrowRight, X, Beaker, CheckCircle2 } from "lucide-react";
import { getTestsDueTodayAction } from "@/actions/job-assignment.actions";
import { Badge } from "@/components/ui/badge";

interface TestsDueTodayModalProps {
  userId: string;
}

interface DueTestItem {
  id: string;
  status: string;
  due_date: string | null;
  job_entry_tests?: {
    id: string;
    uid_label: string | null;
    date_of_testing: string | null;
    material_description: string | null;
    test_master?: {
      component_parameter?: string | null;
      specific_test?: string | null;
    } | null;
    job_entries?: {
      id: string;
      project_name?: string | null;
      clients?: {
        name?: string | null;
      } | null;
    } | null;
  } | null;
}

export function TestsDueTodayModal({ userId }: TestsDueTodayModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dueTests, setDueTests] = useState<DueTestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function checkTestsDue() {
      try {
        const dismissed = sessionStorage.getItem(`tests_due_today_dismissed_${userId}`);
        const res = await getTestsDueTodayAction(userId);
        if (isMounted && res.success && res.data && res.data.length > 0) {
          setDueTests(res.data as DueTestItem[]);
          if (!dismissed) {
            setIsOpen(true);
          }
        }
      } catch (err) {
        console.error("Failed to check tests due today:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (userId) {
      checkTestsDue();
    }

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const handleDismiss = () => {
    setIsOpen(false);
    sessionStorage.setItem(`tests_due_today_dismissed_${userId}`, "true");
  };

  if (loading || dueTests.length === 0) {
    return null;
  }

  return (
    <>
      {/* Alert banner if modal was dismissed or minimized */}
      {!isOpen && dueTests.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                Action Required: {dueTests.length} Test{dueTests.length > 1 ? "s" : ""} Due Today
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                  Today's Schedule
                </Badge>
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                You have testing scheduled for today. Please review and record test results.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <span>View Due Tests</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Modal Popup */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-amber-50/60 to-orange-50/40">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Calendar className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Tests Due Today</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {dueTests.length} testing task{dueTests.length > 1 ? "s are" : " is"} scheduled for today
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="w-8 h-8 rounded-full hover:bg-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Test List */}
            <div className="p-6 max-h-[400px] overflow-y-auto space-y-3">
              {dueTests.map((item) => {
                const test = item.job_entry_tests;
                const tm = test?.test_master;
                const client = test?.job_entries?.clients;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-orange-200 hover:shadow-sm transition-all flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
                        <Beaker className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-800 truncate">
                            {tm?.component_parameter || test?.material_description || "Material Test"}
                          </span>
                          {test?.uid_label && (
                            <Badge variant="outline" className="bg-white text-orange-600 border-orange-200 text-[11px] font-semibold">
                              UID: {test.uid_label}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {client?.name ? `Client: ${client.name}` : tm?.specific_test || "Standard Test"}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/job-assignments/${item.id}`}
                      onClick={handleDismiss}
                      className="flex-shrink-0 px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <span>Open</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Tip: Complete or upload report to clear due items.
              </span>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition-colors"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
