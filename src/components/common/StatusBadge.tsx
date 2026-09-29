import React from "react";
import { Circle } from "lucide-react";

export interface StatusBadgeProps {
  status: string | null;
  isActive: boolean | null;
}

export function StatusBadge({ status, isActive }: StatusBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <Circle
        className={`w-2.5 h-2.5 fill-current ${
          isActive
            ? "text-emerald-500"
            : "text-rose-500"
        }`}
      />
      <span className="text-sm font-medium text-zinc-700  capitalize">
        {status || (isActive ? "Active" : "Inactive")}
      </span>
    </div>
  );
}
