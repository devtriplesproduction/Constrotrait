"use client";

import { useState } from "react";
import { EmployeeApplication, EmployeeApplicationStatus } from "@/services/employee-application.service";
import { updateApplicationStatus } from "@/actions/employee-application.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PrintableApplication } from "./PrintableApplication";
import { format } from "date-fns";
import { Printer, X } from "lucide-react";

interface ReviewApplicationListProps {
  applications: EmployeeApplication[];
}

export function ReviewApplicationList({ applications }: ReviewApplicationListProps) {
  const [selectedApp, setSelectedApp] = useState<EmployeeApplication | null>(null);
  const [remark, setRemark] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-green-500">Approved</Badge>;
      case "rejected": return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const handleAction = async (status: EmployeeApplicationStatus) => {
    if (!selectedApp) return;
    setLoading(true);

    try {
      const res = await updateApplicationStatus(selectedApp.id, status, remark);
      if (res.success) {
        toast({ title: `Application ${status}` });
        setSelectedApp(null);
        setRemark("");
      } else {
        toast({ title: "Error", description: res.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const closeModal = () => {
    setSelectedApp(null);
    setRemark("");
  };

  return (
    <div>
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Status</th>
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
                  <td className="px-4 py-3">
                    {app.profiles?.first_name} {app.profiles?.last_name}
                    <div className="text-xs text-muted-foreground">{app.profiles?.designation}</div>
                  </td>
                  <td className="px-4 py-3">{format(new Date(app.application_date), "PP")}</td>
                  <td className="px-4 py-3">{app.subject}</td>
                  <td className="px-4 py-3">{getStatusBadge(app.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => setSelectedApp(app)}>
                      Review
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
              <h2 className="text-xl font-semibold">Review Application</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" /> Print PDF
                </Button>
                <Button variant="ghost" size="icon" onClick={closeModal}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="print:block print:w-full print:absolute print:top-0 print:left-0 print:m-0 print:p-0">
              <PrintableApplication application={selectedApp} />
            </div>

            {selectedApp.status === "pending" && (
              <div className="mt-8 space-y-4 print:hidden p-6 border-t bg-muted/30">
                <div>
                  <label className="text-sm font-medium">Remark (Optional)</label>
                  <textarea 
                    value={remark} 
                    onChange={(e) => setRemark(e.target.value)} 
                    placeholder="Add a remark for the employee..."
                    className="w-full mt-1 min-h-[80px] p-2 text-sm rounded-md border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="destructive" 
                    onClick={() => handleAction("rejected")}
                    disabled={loading}
                  >
                    Reject
                  </Button>
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white" 
                    onClick={() => handleAction("approved")}
                    disabled={loading}
                  >
                    Approve
                  </Button>
                </div>
              </div>
            )}

            {selectedApp.status !== "pending" && (
              <div className="mt-8 print:hidden border-t p-6 bg-muted/30">
                <h4 className="font-semibold mb-2">Review Details</h4>
                <p><strong>Status:</strong> {selectedApp.status}</p>
                <p><strong>Remark:</strong> {selectedApp.reviewer_remark || "N/A"}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
