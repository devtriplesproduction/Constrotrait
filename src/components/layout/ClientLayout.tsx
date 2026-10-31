"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { AdminSidebar } from "@/components/layout/sidebars/AdminSidebar";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { SessionTimeoutManager } from "@/components/common/SessionTimeoutManager";

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
  const [isManuallyCollapsed, setIsManuallyCollapsed] = useState(false);
  const [activeRole, setActiveRole] = useState(role);
  const pathname = usePathname();

  useEffect(() => {
    setActiveRole(role);
  }, [role]);

  // Route-based hiding (e.g. Inward wizard /clients/new)
  const isWizardRoute = pathname?.startsWith("/clients/new");

  // DOM-based active modal/popup detection
  const [hasActiveModal, setHasActiveModal] = useState(false);

  useEffect(() => {
    const checkModal = () => {
      // Detect any active modal, dialog overlay or fixed popup in the DOM
      const modal = document.querySelector(
        '[role="dialog"], .fixed.inset-0.z-50, .fixed.inset-0.z-\\[60\\], .fixed.inset-0.z-\\[100\\], .fixed.inset-0.bg-slate-900\\/60'
      );
      setHasActiveModal(!!modal);
    };

    checkModal();
    const observer = new MutationObserver(checkModal);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    return () => observer.disconnect();
  }, []);

  const shouldHideSidebar = (isWizardRoute || hasActiveModal || isManuallyCollapsed) && !isSidebarOpen;

  const handleMenuClick = () => {
    if (shouldHideSidebar) {
      setSidebarOpen(true);
    } else {
      setSidebarOpen((prev) => !prev);
      setIsManuallyCollapsed((prev) => !prev);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <SessionTimeoutManager />
      <AdminSidebar
        isOpen={isSidebarOpen}
        setIsOpen={setSidebarOpen}
        role={activeRole}
        roles={[activeRole]}
        hideOnDesktop={shouldHideSidebar}
      />

      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <Topbar
          user={user}
          role={activeRole}
          roles={roles}
          branchName={branchName}
          onMenuClick={handleMenuClick}
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
