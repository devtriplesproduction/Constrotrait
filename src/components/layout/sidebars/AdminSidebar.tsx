"use client";

import React from "react";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Building2,
  Calendar,
  CalendarDays,
  Banknote,
  UserSquare,
  /*
  Receipt,
  FileText,
  Landmark,
  Scale,
  BarChart3,
  Scroll,
  CreditCard,
  BookOpen,
  */
} from "lucide-react";
import { BaseSidebar, SidebarLink } from "./BaseSidebar";
import { canManageTestMaster, canManageClientsAndJobs /*, canViewAccounting */ } from "@/config/roles";

interface AdminSidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  role?: string;
  roles?: string[];
}

export function AdminSidebar({ isOpen, setIsOpen, role, roles }: AdminSidebarProps) {
  const roleArray = roles && roles.length > 0 ? roles : (role ? [role] : []);
  const isEmployeeManagementAllowed = roleArray.some(r => r.includes('ADMIN') || r === 'HR');
  const isPayrollAllowed = roleArray.some(r => r === 'HR' || r.includes('SUPER_ADMIN') || r.includes('BRANCH_MANAGER_ADMINISTRATIVE'));

  const adminLinks: SidebarLink[] = [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { title: "EOD Reports", href: "/eod", icon: ClipboardList },
  ];

  if (roleArray.some(r => r.includes('SUPER_ADMIN'))) {
    adminLinks.push({ title: "Branch Management", href: "/branches", icon: Building2 });
  }

  if (isEmployeeManagementAllowed) {
    adminLinks.push({
      title: "Employee Management",
      icon: Users,
      subLinks: [{ title: "All Employees", href: "/employees", icon: Users }],
    });
  }

  adminLinks.push(
    { title: "Leave", href: "/leave", icon: CalendarDays },
    { title: "Holidays", href: "/holidays", icon: Calendar },
    { title: "Applications", href: "/applications", icon: ClipboardList }
  );

  if (canManageTestMaster(roleArray)) {
    adminLinks.push({ title: "Create Test", href: "/tests", icon: ClipboardList });
  }

  if (canManageClientsAndJobs(roleArray)) {
    adminLinks.push({
      title: "Client Inward",
      icon: UserSquare,
      subLinks: [
        { title: "Clients", href: "/clients", icon: UserSquare },
        { title: "Job Assignments", href: "/job-assignments", icon: ClipboardList },
      ],
    });
  } else {
    adminLinks.push(
      { title: "Job Assignments", href: "/job-assignments", icon: ClipboardList }
    );
  }

  if (isPayrollAllowed) {
    adminLinks.push({ title: "Payroll", href: "/hr/payroll", icon: Banknote });
  }

  /*
  // Hidden from sidebar as requested
  if (canViewAccounting(roleArray)) {
    adminLinks.push({
      title: "Accounting",
      icon: Receipt,
      subLinks: [
        { title: "Dashboard", href: "/accounting", icon: LayoutDashboard },
        { title: "Quotations", href: "/accounting/quotations", icon: FileText },
        { title: "T&C Templates", href: "/accounting/templates", icon: Scroll },
        { title: "Billings & Collection", href: "/accounting/billing", icon: CreditCard },
        { title: "Ledgers", href: "/accounting/ledgers", icon: BookOpen },
        { title: "Banks", href: "/accounting/banks", icon: Landmark },
        { title: "Reconciliation", href: "/accounting/reconciliation", icon: Scale },
        { title: "Reports", href: "/accounting/reports", icon: BarChart3 },
      ],
    });
  }
  */

  return <BaseSidebar links={adminLinks} isOpen={isOpen} setIsOpen={setIsOpen} />;
}
