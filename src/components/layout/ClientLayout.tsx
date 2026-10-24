"use client";

import React, { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { AdminSidebar } from "@/components/layout/sidebars/AdminSidebar";
import { ScrollArea } from "@/components/ui/ScrollArea";

import { User } from "@supabase/supabase-js";

interface ClientLayoutProps {
  children: React.ReactNode;
  user: User;
  role: string;
  roles?: string[];
  branchName?: string;
}

export function ClientLayout({ children, user, role, roles = [], branchName }: ClientLayoutProps) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activeRole, setActiveRole] = useState(role);

  useEffect(() => {
    setActiveRole(role);
  }, [role]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AdminSidebar
        isOpen={isSidebarOpen}
        setIsOpen={setSidebarOpen}
        role={activeRole}
        roles={[activeRole]}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          user={user}
          role={activeRole}
          roles={roles}
          branchName={branchName}
          onMenuClick={() => setSidebarOpen(true)}
          onRoleChange={(newRole) => {
            setActiveRole(newRole);
          }}
        />
        <ScrollArea className="flex-1" orientation="vertical">
          <main className="p-4 md:p-6 lg:px-8 lg:py-6">
            {children}
          </main>
        </ScrollArea>
      </div>
    </div>
  );
}
