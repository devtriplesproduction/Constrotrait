"use client";

import React, { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface TodayTest {
  id: string;
  job_entry_tests: {
    test_master: {
      specific_test: string;
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
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
          <ClipboardList className="w-8 h-8" />
        </div>
        
        <div className="mb-4 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Tests Assigned Today! 📋</h2>
          <p className="text-slate-600">
            Hello {currentUserProfile?.first_name}, you have <strong>{todayTests.length}</strong> test{todayTests.length > 1 ? 's' : ''} scheduled for today.
          </p>
        </div>

        <div className="w-full max-h-48 overflow-y-auto space-y-2 mb-4">
          {todayTests.map(test => (
            <div key={test.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3 text-left">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                {test.job_entry_tests?.test_master?.specific_test?.[0] || 'T'}
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm line-clamp-1">{test.job_entry_tests?.test_master?.specific_test || 'Unknown Test'}</p>
                <p className="text-xs text-slate-500">Please check your assignments tab</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 w-full mt-2">
          <Button
            onClick={() => setIsOpen(false)}
            variant="outline"
            className="flex-1 py-3 px-4 font-bold rounded-xl transition-colors"
          >
            Later
          </Button>
          <Link href="/job-assignments?tab=schedule" onClick={() => setIsOpen(false)} className="flex-1">
            <Button
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
            >
              View Testing Schedule
            </Button>
          </Link>
        </div>
      </div>
    </Modal>
  );
}
