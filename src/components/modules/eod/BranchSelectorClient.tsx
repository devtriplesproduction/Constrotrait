'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Dropdown } from '@/components/ui/Dropdown';
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
    <div className="w-48">
      <Dropdown
        name="branch"
        value={currentBranch}
        onChange={(val) => handleChange(val as string)}
        options={[
          { label: 'All Branches', value: 'all' },
          ...branches.map(b => ({ label: b.name, value: b.id }))
        ]}
        buttonClassName="h-[40px] rounded-xl bg-white border border-orange-500 hover:border-orange-600 text-orange-600 font-semibold"
        iconClassName="text-orange-600"
      />
    </div>
  );
}
