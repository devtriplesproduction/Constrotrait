"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  Mail,
  Search,
  ShieldAlert,
  Cake,
  User,
  Key,
  RefreshCw,
  Eye,
  EyeOff,
  Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar } from "@/components/common/Avatar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { resetEmployeePasswordAction } from "@/actions/admin.actions";
import { EmployeeProfileModal } from "./EmployeeProfileModal";
import { Dropdown } from "../../ui/Dropdown";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Json } from "@/types/database";

const generateRandomPassword = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
  let newPassword = '';
  if (typeof window !== 'undefined' && window.crypto) {
    const randomValues = new Uint32Array(12);
    window.crypto.getRandomValues(randomValues);
    for (let i = 0; i < 12; i++) {
      newPassword += chars.charAt(randomValues[i] % chars.length);
    }
  } else {
    for (let i = 0; i < 12; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return newPassword;
};

type EmployeeProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  roles: string[];
  department: string | null;
  designation: string | null;
  phone_number: string | null;
  employee_id: string | null;
  joining_date: string | null;
  status: string | null;
  is_active: boolean | null;
  dob?: string | null;
  gender?: string | null;
  personal_email?: string | null;
  salary?: number | null;
  experience?: number | null;
  employment_type?: string | null;
  profile_photo?: string | null;
  documents?: Json;
  residential_address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_relation?: string | null;
  emergency_contact_number?: string | null;
};

interface EmployeeTableProps {
  employees: EmployeeProfile[];
}

export function EmployeeTable({ employees }: EmployeeTableProps) {
  const [activeTab, setActiveTab] = useState<"directory" | "security" | "birthdays">("directory");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");

  const [isPending, startTransition] = useTransition();
  const [securityInputs, setSecurityInputs] = useState<Record<string, { value: string; show: boolean }>>({});
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfile | null>(null);
  const { toast } = useToast();

  // Filtering
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch =
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.employee_id && emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDept = departmentFilter === "All" || emp.department === departmentFilter;

      // Hide super admins from standard view to prevent clutter/accidents
      // const notSuperAdmin = !emp.roles.includes('SUPER_ADMIN');

      return matchesSearch && matchesDept;
    });
  }, [employees, searchQuery, departmentFilter]);

  // Extract unique departments for filter
  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department).filter((d): d is string => Boolean(d)));
    return ["All", ...Array.from(depts)];
  }, [employees]);

  // Birthday Calculation
  const allBirthdays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return employees
      .filter(emp => emp.dob && emp.status !== 'Terminated')
      .map(emp => {
        const dob = new Date(emp.dob!);
        const nextBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        if (nextBirthday < today) {
          nextBirthday.setFullYear(today.getFullYear() + 1);
        }

        const diffTime = Math.abs(nextBirthday.getTime() - today.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return { ...emp, nextBirthday, diffDays, dob: emp.dob };
      })
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [employees]);

  const handleGeneratePassword = (userId: string) => {
    const newPassword = generateRandomPassword();
    setSecurityInputs(prev => ({
      ...prev,
      [userId]: { ...prev[userId], value: newPassword }
    }));
  };

  const handleUpdatePassword = (userId: string) => {
    const newPassword = securityInputs[userId]?.value;
    if (!newPassword) {
      toast({ title: "Please enter a password", variant: "error" });
      return;
    }
    startTransition(async () => {
      const res = await resetEmployeePasswordAction(userId, newPassword);
      if (res.success) {
        toast({ title: "Password updated successfully", variant: "success" });
        setSecurityInputs(prev => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      } else {
        toast({ title: "Failed to reset password: " + res.error, variant: "error" });
      }
    });
  };

  return (
    <div className="w-full space-y-4">

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-zinc-200">
        <Button variant="ghost" onClick={() => setActiveTab("directory")}
          className={`flex items-center gap-2 px-2 py-4 text-sm font-semibold transition-all relative ${activeTab === "directory" ? "text-orange-600" : "text-zinc-500 hover:text-zinc-700"
            }`}
        >
          <User className="w-4 h-4" />
          Personnel Directory
          {activeTab === "directory" && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-600 rounded-t-full" />
          )}
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-2 py-4 text-sm font-bold transition-all relative ${activeTab === "security" ? "text-orange-600" : "text-zinc-500 hover:text-zinc-700"
            }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Account Security
          {activeTab === "security" && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-600 rounded-t-full" />
          )}
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab("birthdays")}
          className={`flex items-center gap-2 px-2 py-4 text-sm font-bold transition-all relative ${activeTab === "birthdays" ? "text-orange-600" : "text-zinc-500 hover:text-zinc-700"
            }`}
        >
          <Cake className="w-4 h-4" />
          Birthday Details
          {activeTab === "birthdays" && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-600 rounded-t-full" />
          )}
        </Button>
      </div>

      {/* Directory Tab */}
      {activeTab === "directory" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="text"
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-200  bg-white  text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <Dropdown
                value={departmentFilter}
                onChange={(val) => setDepartmentFilter(val)}
                className="w-56"
                buttonClassName="h-10 px-4 bg-white border-zinc-200"
                options={departments.map(dept => ({ label: dept === "All" ? "All Departments" : dept, value: dept }))}
              />
            </div>
          </div>

          <div className="w-full overflow-hidden bg-white  rounded-3xl border border-zinc-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50  border-b border-zinc-200 ">
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500  uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500  uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500  uppercase tracking-wider">Department</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500  uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500  uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 ">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-zinc-50/50 transition-colors cursor-pointer" onClick={() => setSelectedEmployee(emp)}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            initials={`${emp.first_name[0]}${emp.last_name[0]}`}
                            imageUrl={emp.profile_photo}
                            className="w-10 h-10 bg-orange-100 "
                            textClassName="text-orange-600  font-bold"
                          />
                          <div>
                            <p className="font-semibold text-zinc-900 ">{emp.first_name} {emp.last_name}</p>
                            <p className="text-xs text-zinc-500 ">{emp.employee_id || "N/A"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-3 py-1 text-xs font-semibold text-orange-700 bg-orange-50 rounded-full">
                          {emp.designation || (emp.roles && emp.roles.map(r => r.replace(/_/g, " ")).join(", "))}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {emp.department ? (
                          <span className="inline-flex px-3 py-1 text-xs font-semibold text-purple-700 bg-purple-50 rounded-full">
                            {emp.department}
                          </span>
                        ) : (
                          <span className="text-sm text-zinc-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 text-sm text-zinc-600 ">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-zinc-400" />
                            {emp.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={emp.status} isActive={emp.is_active} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="w-full overflow-hidden bg-white rounded-3xl border border-slate-200">
            <div className="overflow-x-auto p-4 sm:p-6">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-1/3">Employee Identity</th>
                    <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-1/3">Access Level</th>
                    <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right w-1/3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map((emp) => {
                    const inputState = securityInputs[emp.id] || { value: '', show: false };
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar
                                initials={`${emp.first_name[0]}${emp.last_name[0]}`}
                                imageUrl={emp.profile_photo}
                                className="w-10 h-10 bg-orange-50"
                                textClassName="text-orange-600 font-bold text-sm"
                              />
                              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${emp.is_active !== false && emp.status !== 'Terminated' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{emp.first_name} {emp.last_name}</p>
                              <p className="text-sm font-medium text-slate-500">{emp.department || "General"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                              <Mail className="w-4 h-4 text-slate-400" />
                              {emp.email}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {emp.roles && emp.roles.map(r => (
                                <span key={r} className="inline-flex px-2.5 py-0.5 text-xs font-semibold text-orange-700 bg-orange-50 rounded-full">
                                  {r.replace(/_/g, " ")}
                                </span>
                              ))}
                              <StatusBadge status={emp.status} isActive={emp.is_active} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="relative w-48 hidden sm:block">
                              <Input
                                type={inputState.show ? "text" : "password"}
                                placeholder="Set new credentials..."
                                value={inputState.value}
                                onChange={(e) => setSecurityInputs(prev => ({ ...prev, [emp.id]: { ...prev[emp.id], value: e.target.value } }))}
                                className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm font-medium text-slate-700 focus:border-orange-500 outline-none placeholder:text-slate-400 placeholder:font-medium"
                              />
                              <Button variant="ghost" onClick={() => setSecurityInputs(prev => ({ ...prev, [emp.id]: { ...prev[emp.id], show: !prev[emp.id]?.show } }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                {inputState.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </Button>
                            </div>
                            <Button variant="ghost" onClick={() => handleGeneratePassword(emp.id)}
                              className="p-2.5 text-slate-400 border border-slate-200 rounded-full hover:bg-slate-50 hover:text-slate-600 transition-colors"
                              title="Generate Password"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleUpdatePassword(emp.id)}
                              disabled={isPending || !inputState.value || emp.status === 'Terminated'}
                              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                              <Key className="w-4 h-4" />
                              Update
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Birthdays Tab */}
      {activeTab === "birthdays" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="w-full overflow-hidden bg-white rounded-3xl border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-pink-50 rounded-2xl text-pink-500">
                <Cake className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Employee Birthdays</h2>
                <p className="text-sm text-slate-500">A complete list of all employee birthdates, sorted by upcoming dates.</p>
              </div>
            </div>
            <div className="overflow-x-auto px-4 pb-4 pt-2 sm:px-6 sm:pb-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Employee</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Department</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Date of Birth</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allBirthdays.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            initials={`${emp.first_name[0]}${emp.last_name[0]}`}
                            className="w-10 h-10 bg-orange-50"
                            textClassName="text-orange-600 font-bold text-sm"
                          />
                          <div>
                            <p className="font-semibold text-slate-900">{emp.first_name} {emp.last_name}</p>
                            <p className="text-xs text-slate-500">{emp.employee_id || "N/A"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {emp.department ? (
                          <span className="inline-flex px-3 py-1 text-xs font-semibold text-purple-700 bg-purple-50 rounded-full">
                            {emp.department}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {new Date(emp.dob!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={emp.status} isActive={emp.is_active} />
                      </td>
                    </tr>
                  ))}
                  {allBirthdays.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-slate-500 border-t border-slate-100">
                        No birthday data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}



      {/* Profile Modal */}
      {selectedEmployee && (
        <EmployeeProfileModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}

    </div>
  );
}

