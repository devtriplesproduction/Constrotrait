"use client";

import React, { useEffect, useState } from "react";
import { Cake, PartyPopper } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { canViewAllBirthdays } from "@/config/roles";

type BirthdayUser = {
  id: string;
  first_name: string;
  last_name: string;
  dob?: string | null;
  roles?: string[];
};

type CurrentUserProfile = {
  id: string;
  first_name: string;
  last_name: string;
  roles: string[];
  department: string | null;
  dob: string | null;
};

interface BirthdayNotifierProps {
  currentUserProfile: CurrentUserProfile | null;
  todayBirthdays: BirthdayUser[];
}

export function BirthdayNotifier({ currentUserProfile, todayBirthdays }: BirthdayNotifierProps) {
  const [isOpen, setIsOpen] = useState(false);

  const myBirthday = todayBirthdays.some(emp => emp.id === currentUserProfile?.id);
  const isHrOrManager = canViewAllBirthdays(currentUserProfile?.roles);
  const colleagueBirthdays = todayBirthdays.filter(emp => emp.id !== currentUserProfile?.id);
  const showColleagues = isHrOrManager && colleagueBirthdays.length > 0;

  useEffect(() => {
    if (!currentUserProfile) return;
    if (todayBirthdays.length === 0) return;

    if (myBirthday || showColleagues) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentUserProfile, todayBirthdays, myBirthday, showColleagues]);

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 bg-pink-100 text-pink-500 rounded-full flex items-center justify-center mb-4">
          <PartyPopper className="w-8 h-8" />
        </div>
        
        {myBirthday && (
          <div className="mb-4 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Happy Birthday! 🎉</h2>
            <p className="text-slate-600">
              Wishing you a fantastic birthday, {currentUserProfile?.first_name}! Have a great day ahead!
            </p>
          </div>
        )}

        {myBirthday && showColleagues && (
          <div className="w-full h-px bg-slate-100 my-4" />
        )}

        {showColleagues && (
          <div className="text-center w-full">
            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center justify-center gap-2">
              <Cake className="w-5 h-5 text-pink-500" />
              Birthdays Today
            </h3>
            <div className="space-y-2">
              {colleagueBirthdays.map(emp => (
                <div key={emp.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3 text-left">
                  <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold">
                    {emp.first_name[0]}{emp.last_name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{emp.first_name} {emp.last_name}</p>
                    <p className="text-xs text-slate-500">Don&apos;t forget to wish them!</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setIsOpen(false)}
          className="mt-6 w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-colors"
        >
          Awesome!
        </button>
      </div>
    </Modal>
  );
}
