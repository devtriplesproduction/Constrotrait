"use client";

import React from "react";
import { FileText } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Json } from "@/types/database";
export type EmployeeProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  roles: string[];
  department: string | null;
  designation: string | null;
  profile_photo?: string | null;
  documents?: Json;
  residential_address?: string | null;
  phone_number: string | null;
  employee_id: string | null;
  joining_date: string | null;
  status: string | null;
  is_active: boolean | null;
  dob?: string | null;
  gender?: string | null;
  personal_email?: string | null;
  salary?: number | null;
};

interface ExportExcelButtonProps {
  employees: EmployeeProfile[];
}

export function ExportExcelButton({ employees }: ExportExcelButtonProps) {
  const handleExport = () => {
    if (!employees || employees.length === 0) {
      alert("No data to export");
      return;
    }

    // Format data for excel
    const dataToExport = employees.map((emp) => ({
      "System ID": emp.id,
      "Employee ID": emp.employee_id || "N/A",
      "First Name": emp.first_name,
      "Last Name": emp.last_name,
      "Full Name": `${emp.first_name} ${emp.last_name}`,
      "Work Email": emp.email,
      "Personal Email": emp.personal_email || "N/A",
      "Phone": emp.phone_number || "N/A",
      "Department": emp.department || "N/A",
      "Designation / Job Title": emp.designation || "N/A",
      "Role": Array.isArray(emp.roles) ? emp.roles.join(", ") : emp.roles,
      "Gender": emp.gender || "N/A",
      "Date of Birth": emp.dob ? new Date(emp.dob).toLocaleDateString() : "N/A",
      "Join Date": emp.joining_date ? new Date(emp.joining_date).toLocaleDateString() : "N/A",
      "Salary": emp.salary !== undefined && emp.salary !== null ? emp.salary : "N/A",
      "Status": emp.status || "Active",
      "Account Active": emp.is_active ? "Yes" : "No",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    
    // Generate excel file and prompt download
    XLSX.writeFile(workbook, `Employees_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <Button
      onClick={handleExport}
      className="flex items-center gap-2 px-4 py-2 bg-white text-orange-600 border border-orange-100 rounded-xl text-sm font-bold tracking-wide transition-all shadow-sm hover:bg-orange-50"
    >
      <FileText className="w-4 h-4" />
      Export Excel
    </Button>
  );
}
