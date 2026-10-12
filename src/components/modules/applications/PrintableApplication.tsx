import React, { forwardRef } from 'react';
import { EmployeeApplication } from '@/services/employee-application.service';

interface PrintableApplicationProps {
  application: EmployeeApplication;
  userProfile?: {
    first_name: string;
    last_name: string;
    designation: string;
    department: string;
  };
}

import { format } from "date-fns";

export const PrintableApplication = forwardRef<HTMLDivElement, PrintableApplicationProps>(
  ({ application, userProfile }, ref) => {
    // Determine the profile info to use (either passed explicitly for 'my' applications, or from the joined data)
    const profile = userProfile || (application.profiles as any) || {
      first_name: "Unknown",
      last_name: "",
      designation: "",
      department: ""
    };

    return (
      <div ref={ref} className="p-8 text-black font-serif text-base leading-relaxed w-full bg-transparent">
        <div className="text-center font-bold mb-8">
          <h2 className="text-2xl mb-2">CONSTROTRAIT MATERIAL TESTING AND SERVICES LLP WAI</h2>
          <h3 className="text-xl underline">APPLICATION FORM</h3>
        </div>

        <div className="flex justify-end mb-8">
          <div className="font-bold">
            Date: {application.application_date ? format(new Date(application.application_date), "dd/MM/yyyy") : ""}
          </div>
        </div>

        <div className="mb-6">
          <p>To,</p>
          <p>The Managing director / Quality Manager .</p>
          <p>Constrotrait Material Testing LLP, Wai.</p>
        </div>

        <div className="mb-6 font-bold flex gap-2">
          <p className="whitespace-nowrap">Subject: Application for</p>
          <p className="whitespace-pre-wrap">{application.subject}</p>
        </div>

        <div className="mb-6">
          <p>Respected Sir/Madam,</p>
        </div>

        <div className="mb-4 text-justify indent-8">
          <p className="inline">I would like to request your approval for </p>
          <p className="inline whitespace-pre-wrap">{application.approval_for}</p>
          <p className="mt-2 inline">The reason for this request is </p>
          <p className="inline whitespace-pre-wrap">{application.reason}</p>
        </div>

        <div className="mb-8 text-justify indent-8">
          <p>Therefore, I kindly request you to consider my application and grant the necessary approval.</p>
        </div>

        <div className="mb-12">
          <p>Thank you.</p>
          <p className="mt-4">Yours faithfully,</p>
        </div>

        <div className="space-y-3">
          <div className="flex">
            <span className="font-bold w-32">Name:</span>
            <span>{profile.first_name} {profile.last_name}</span>
          </div>
          <div className="flex">
            <span className="font-bold w-32">Designation:</span>
            <span>{profile.designation}</span>
          </div>
          <div className="flex">
            <span className="font-bold w-32">Department:</span>
            <span>{profile.department}</span>
          </div>
          <div className="flex mt-8 items-end">
            <span className="font-bold w-32">Signature:</span>
            <span className="border-b border-black w-48 inline-block"></span>
          </div>
        </div>
      </div>
    );
  }
);

PrintableApplication.displayName = "PrintableApplication";
