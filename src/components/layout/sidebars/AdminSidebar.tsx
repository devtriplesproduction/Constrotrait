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
  Database,
  Receipt,
  FileText,
  Scroll,
  CreditCard,
  BookOpen,
  Landmark,
  Scale,
  BarChart3,
} from "lucide-react";
import { BaseSidebar, SidebarLink } from "./BaseSidebar";
import {
  canManageTestMaster,
  canManageClientsAndJobs,
  canManageEmployees,
  canViewAccounting,
  canAccessSystemConsole,
} from "@/config/roles";

interface AdminSidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  role?: string;
  roles?: string[];
  hideOnDesktop?: boolean;
}

export function AdminSidebar({ isOpen, setIsOpen, role, roles, hideOnDesktop = false }: AdminSidebarProps) {
  const roleArray = roles && roles.length > 0 ? roles : (role ? [role] : []);
  const isEmployeeManagementAllowed = canManageEmployees(roleArray);
  const isPayrollAllowed = roleArray.some(r => r === 'HR' || r === 'SUPER_ADMIN' || r === 'BRANCH_MANAGER_ADMINISTRATIVE');

  const adminLinks: SidebarLink[] = [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { title: "EOD Reports", href: "/eod", icon: ClipboardList },
  ];

  if (roleArray.includes('SUPER_ADMIN')) {
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

  if (canViewAccounting(roleArray)) {
    adminLinks.push({
      title: "Accounting",
      icon: Receipt,
      subLinks: [
        { title: "Dashboard", href: "/accounting", icon: LayoutDashboard },
        { title: "Quotations", href: "/accounting/quotations", icon: FileText },
        { title: "T&C Templates", href: "/accounting/templates", icon: Scroll },
        { title: "Billings & Collection", href: "/accounting/billing", icon: CreditCard },
        { title: "Test Financials", href: "/accounting/test-financials", icon: Banknote },
        { title: "Ledgers", href: "/accounting/ledgers", icon: BookOpen },
        { title: "Banks", href: "/accounting/banks", icon: Landmark },
        { title: "Reconciliation", href: "/accounting/reconciliation", icon: Scale },
        { title: "Reports", href: "/accounting/reports", icon: BarChart3 },
      ],
    });
  }

  if (canAccessSystemConsole(roleArray)) {
    adminLinks.push({
      title: "System & Backups",
      href: "/system",
      icon: Database,
    });
  }

  return <BaseSidebar links={adminLinks} isOpen={isOpen} setIsOpen={setIsOpen} hideOnDesktop={hideOnDesktop} />;
}
