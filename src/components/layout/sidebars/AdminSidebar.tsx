"use client";

import React from "react";
import { LayoutDashboard, Users, ClipboardList, Building2, Calendar, CalendarDays, Banknote } from "lucide-react";
import { BaseSidebar, SidebarLink } from "./BaseSidebar";

interface AdminSidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  role?: string;
}

export function AdminSidebar({ isOpen, setIsOpen, role }: AdminSidebarProps) {
  const isEmployeeManagementAllowed = role?.includes('ADMIN') || role === 'HR';
  const isPayrollAllowed = role === 'HR' || role?.includes('SUPER_ADMIN') || role?.includes('BRANCH_MANAGER_ADMINISTRATIVE');

  const adminLinks: SidebarLink[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "EOD Reports",
      href: "/eod",
      icon: ClipboardList,
    },
    {
      title: "Leave",
      href: "/leave",
      icon: CalendarDays,
    },
    {
      title: "Holidays",
      href: "/holidays",
      icon: Calendar,
    },
  ];

  if (isEmployeeManagementAllowed) {
    adminLinks.push({
      title: "Employee Management",
      icon: Users,
      subLinks: [
        {
          title: "All Employees",
          href: "/employees",
          icon: Users,
        },
      ],
    });
  }

  if (isPayrollAllowed) {
    adminLinks.push({
      title: "Payroll",
      href: "/hr/payroll",
      icon: Banknote,
    });
  }

  if (role?.includes('SUPER_ADMIN')) {
    adminLinks.push({
      title: "Branch Management",
      href: "/branches",
      icon: Building2,
    });
  }

  return <BaseSidebar links={adminLinks} isOpen={isOpen} setIsOpen={setIsOpen} />;
}
