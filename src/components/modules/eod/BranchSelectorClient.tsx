'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Dropdown } from '@/components/ui/Dropdown';
import { Building2 } from 'lucide-react';

export function BranchSelectorClient({ branches }: { branches: { id: string; name: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentBranch = searchParams.get('branch') || 'all';

  const handleChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val === 'all') {
      params.delete('branch');
    } else {
      params.set('branch', val);
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 bg-white border border-slate-200 shadow-sm rounded-xl px-1.5 py-0.5 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all">
      <Building2 className="w-4 h-4 text-slate-400 ml-2.5 flex-shrink-0" />
      <div className="w-48">
        <Dropdown
          name="branch"
          value={currentBranch}
          onChange={(val) => handleChange(val as string)}
          options={[
            { label: 'All Branches', value: 'all' },
            ...branches.map(b => ({ label: b.name, value: b.id }))
          ]}
          buttonClassName="border-transparent bg-transparent shadow-none hover:bg-transparent hover:border-transparent focus-visible:ring-0 focus-visible:border-transparent h-9 px-2 !ring-0 !border-transparent !bg-transparent !shadow-none"
        />
      </div>
    </div>
  );
}
