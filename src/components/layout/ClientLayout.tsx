"use client";

import React, { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { AdminSidebar } from "@/components/layout/sidebars/AdminSidebar";

import { User } from "@supabase/supabase-js";

interface ClientLayoutProps {
  children: React.ReactNode;
  user: User;
  role: string;
}

export function ClientLayout({ children, user, role }: ClientLayoutProps) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar - we can dynamically select the sidebar based on role later, 
          for now we use AdminSidebar if role is SUPER_ADMIN or HR */}
      <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} role={role} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar user={user} role={role} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:px-8 lg:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
