import React from "react";
import { Database } from "@/types/database";
import { Users, Building2, ShieldAlert, Shield } from "lucide-react";
import { getAllEmployees } from "@/services/employee.service";
import { EmployeeTable } from "@/components/modules/employees/EmployeeTable";
import { OnboardEmployeeButton } from "@/components/modules/employees/OnboardEmployeeButton";
import { PageHeader } from "@/components/modules/PageHeader";
import { ExportExcelButton } from "@/components/modules/employees/ExportExcelButton";

export const metadata = {
  title: "Employees | ConstroTrait",
  description: "Manage organization employees and directory.",
};

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const { data, success, error } = await getAllEmployees();
  const employees = data as Database['public']['Tables']['profiles']['Row'][];

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Team Management"
          subtitle="Manage permissions, invite surveyors, and maintain system security."
          actions={
            <>
              <ExportExcelButton employees={employees || []} />
              <OnboardEmployeeButton />
            </>
          }
        />

        {/* Stat Cards */}
        {success && employees && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-white border border-slate-200 rounded-3xl flex items-center gap-4">
              <div className="p-3 bg-orange-50 text-orange-500 rounded-2xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Staff</p>
                <p className="text-2xl font-bold text-slate-900">{employees.length}</p>
              </div>
            </div>
            
            <div className="p-5 bg-white border border-slate-200 rounded-3xl flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Accounts</p>
                <p className="text-2xl font-bold text-slate-900">
                  {employees.filter(e => e.is_active !== false && e.status !== 'Terminated').length}
                </p>
              </div>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-3xl flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Admins</p>
                <p className="text-2xl font-bold text-slate-900">
                  {employees.filter(e => e.roles.includes('SUPER_ADMIN') || e.roles.includes('ADMIN_INWARD_CRE')).length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {!success && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-200">
          Failed to load employees: {error}
        </div>
      )}

      {success && employees && employees.length > 0 ? (
        <EmployeeTable employees={employees} />
      ) : (
        /* Empty State */
        <div className="border border-dashed border-zinc-200  rounded-3xl p-12 flex flex-col items-center justify-center text-center bg-zinc-50/50">
          <div className="w-20 h-20 bg-zinc-100  rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-10 h-10 text-zinc-400" />
          </div>
          <h3 className="text-xl font-bold text-zinc-800 ">No Employees Found</h3>
          <p className="text-sm text-zinc-500  mt-2 max-w-md">
            Your directory is empty. Onboard your first employee to get started with the HR management system.
          </p>
          <div className="mt-8">
            <OnboardEmployeeButton className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold transition-all shadow-lg hover:scale-105" />
          </div>
        </div>
      )}

    </div>
  );
}


