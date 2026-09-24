"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Users, ClipboardList, ListTodo, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface JobAssignmentsTabsClientProps {
  activeTab: string;
  isManager: boolean;
}

export function JobAssignmentsTabsClient({ activeTab, isManager }: JobAssignmentsTabsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [clickedTab, setClickedTab] = useState<string | null>(null);
  const [prevActiveTab, setPrevActiveTab] = useState(activeTab);

  if (activeTab !== prevActiveTab) {
    setPrevActiveTab(activeTab);
    setClickedTab(null);
  }

  const handleTabChange = (tab: string) => {
    if (tab === activeTab || isPending) return;
    setClickedTab(tab);
    
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  return (
    <div className="flex bg-slate-100 p-1 rounded-xl h-[48px] items-center">
      {isManager && (
        <>
          <Button
            variant="custom" size="none"
            onClick={() => handleTabChange('teams')}
            disabled={isPending}
            className={`px-4 h-full rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'teams' ? 'bg-orange-500 text-white shadow' : 'text-slate-600 hover:text-slate-800'
            } ${isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isPending && clickedTab === 'teams' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            Teams
          </Button>
          
          <Button
            variant="custom" size="none"
            onClick={() => handleTabChange('assign')}
            disabled={isPending}
            className={`px-4 h-full rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'assign' ? 'bg-orange-500 text-white shadow' : 'text-slate-600 hover:text-slate-800'
            } ${isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isPending && clickedTab === 'assign' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
            Assign Jobs
          </Button>

          <Button
            variant="custom" size="none"
            onClick={() => handleTabChange('list')}
            disabled={isPending}
            className={`px-4 h-full rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'list' ? 'bg-orange-500 text-white shadow' : 'text-slate-600 hover:text-slate-800'
            } ${isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isPending && clickedTab === 'list' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListTodo className="w-4 h-4" />}
            Assignments
          </Button>
        </>
      )}

      <Button
        variant="custom" size="none"
        onClick={() => handleTabChange('my')}
        disabled={isPending}
        className={`px-4 h-full rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
          activeTab === 'my' ? 'bg-orange-500 text-white shadow' : 'text-slate-600 hover:text-slate-800'
        } ${isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        {isPending && clickedTab === 'my' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListTodo className="w-4 h-4" />}
        My Assignments
      </Button>
    </div>
  );
}
