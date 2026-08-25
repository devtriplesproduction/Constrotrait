import React from "react";
import { getAuthenticatedUser } from "@/services/auth.service";
import { PageHeader } from "@/components/modules/PageHeader";

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();
  const firstName = user?.user_metadata?.first_name || "User";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle="Here's an overview of your workspace today."
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Placeholder for future widgets */}
        <div className="bg-white  p-6 rounded-xl border border-zinc-200  shadow-sm">
          <h3 className="text-sm font-medium text-zinc-500 ">
            Quick Actions
          </h3>
          <p className="mt-2 text-zinc-900 ">
            You can onboard new employees from the sidebar.
          </p>
        </div>
      </div>
    </div>
  );
}
