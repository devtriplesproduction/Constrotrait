"use client";

import { useState, useRef } from "react";
import { EmployeeApplication } from "@/services/employee-application.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PrintableApplication } from "./PrintableApplication";
import { format } from "date-fns";
import { Printer, X } from "lucide-react";

interface ApplicationListProps {
  applications: EmployeeApplication[];
  userProfile: {
    first_name: string;
    last_name: string;
    designation: string;
    department: string;
  };
}

export function ApplicationList({ applications, userProfile }: ApplicationListProps) {
  const [selectedApp, setSelectedApp] = useState<EmployeeApplication | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-green-500">Approved</Badge>;
      case "rejected": return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Reviewer Remark</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {applications.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-muted-foreground">
                  No applications found.
                </td>
              </tr>
            ) : (
              applications.map(app => (
                <tr key={app.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">{format(new Date(app.application_date), "PP")}</td>
                  <td className="px-4 py-3">{app.subject}</td>
                  <td className="px-4 py-3">{getStatusBadge(app.status)}</td>
                  <td className="px-4 py-3">{app.reviewer_remark || "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => setSelectedApp(app)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!!selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col relative">
            <div className="print:hidden p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold">Application Details</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" /> Print PDF
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setSelectedApp(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="print:block print:w-full print:absolute print:top-0 print:left-0 print:m-0 print:p-0">
              <PrintableApplication application={selectedApp} userProfile={userProfile} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
