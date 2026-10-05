"use client";

import React, { useEffect, useState } from 'react';
import { Sparkles, CalendarClock, ArrowRight } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface TodayTest {
  id: string;
  job_entry_tests: {
    test_master: {
      specific_test: string;
      component_parameter: string;
    } | null;
  };
}

interface TestAssignmentNotifierProps {
  currentUserProfile: any;
  todayTests: TodayTest[];
}

export function TestAssignmentNotifier({ currentUserProfile, todayTests }: TestAssignmentNotifierProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!currentUserProfile) return;
    if (todayTests.length === 0) return;

    const today = new Date().toISOString().split('T')[0];
    const storageKey = `test_notified_${currentUserProfile.id}_${today}`;
    
    if (localStorage.getItem(storageKey)) return;

    const timer = setTimeout(() => {
      setIsOpen(true);
      localStorage.setItem(storageKey, 'true');
    }, 1000);
    return () => clearTimeout(timer);
  }, [currentUserProfile, todayTests]);

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <div className="flex flex-col items-center p-2 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-orange-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>

        <div className="w-20 h-20 bg-gradient-to-tr from-orange-500 to-orange-400 text-white rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-orange-500/30 transform -rotate-6 z-10">
          <CalendarClock className="w-10 h-10 transform rotate-6" />
        </div>
        
        <div className="mb-6 text-center z-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2 flex items-center justify-center gap-2">
            Today's Assignments <Sparkles className="w-5 h-5 text-orange-400" />
          </h2>
          <p className="text-slate-600">
            Welcome back, <span className="font-semibold text-slate-800">{currentUserProfile?.first_name}</span>. You have <strong className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">{todayTests.length}</strong> test{todayTests.length > 1 ? 's' : ''} scheduled for today.
          </p>
        </div>

        <div className="w-full max-h-[220px] overflow-y-auto space-y-3 mb-6 pr-1 custom-scrollbar z-10">
          {todayTests.map(test => {
            const specificTest = test.job_entry_tests?.test_master?.specific_test;
            const componentParameter = test.job_entry_tests?.test_master?.component_parameter;
            const testName = specificTest || componentParameter || 'Unknown Test';
            const initial = testName[0]?.toUpperCase() || 'T';

            return (
              <div key={test.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 text-left hover:border-orange-300 transition-colors group">
                <div className="w-12 h-12 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-700 rounded-lg flex items-center justify-center font-bold text-lg border border-slate-200 group-hover:scale-105 transition-transform shrink-0">
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-[15px] truncate">{testName}</p>
                  <p className="text-xs text-slate-500 font-medium">Pending execution</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 w-full mt-2 z-10">
          <Button
            onClick={() => setIsOpen(false)}
            variant="outline"
            className="flex-1 py-6 font-bold rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Remind me later
          </Button>
          <Link href="/job-assignments?tab=schedule" onClick={() => setIsOpen(false)} className="flex-[2]">
            <Button
              className="w-full py-6 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:-translate-y-0.5 group flex items-center justify-center gap-2"
            >
              View Schedule <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </Modal>
  );
}
