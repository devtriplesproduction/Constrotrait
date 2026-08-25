'use client';

import { useState } from 'react';
import { reviewEODAction } from '@/actions/eod.actions';
import { useRouter } from 'next/navigation';
import { EODReport } from '@/services/eod.service';

export function EODReviewTable({ eods }: { eods: (EODReport & { profiles: { first_name: string, last_name: string, employee_id: string } | null })[] }) {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  async function handleReview(eodId: string, action: 'Approve' | 'Reject') {
    const reason = action === 'Reject' ? window.prompt("Enter rejection reason:") : undefined;
    
    if (action === 'Reject' && (!reason || reason.trim() === '')) {
      alert("Rejection reason is required.");
      return;
    }

    setLoading(eodId);
    
    const formData = new FormData();
    formData.append('eod_id', eodId);
    formData.append('action', action);
    if (reason) formData.append('rejection_reason', reason);

    const res = await reviewEODAction(formData);
    
    if (!res.success) {
      alert(res.error || 'Failed to review EOD');
    } else {
      router.refresh();
    }
    
    setLoading(null);
  }

  if (!eods || eods.length === 0) {
    return <div className="text-gray-500 bg-white p-6 rounded-lg border text-center">No pending EODs to review.</div>;
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {eods.map((eod) => (
            <tr key={eod.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                {eod.profiles?.first_name} {eod.profiles?.last_name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {eod.report_date}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {eod.location}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {eod.office_hours}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                <button 
                  onClick={() => handleReview(eod.id, 'Approve')}
                  disabled={loading === eod.id}
                  className="text-green-600 hover:text-green-900 disabled:opacity-50"
                >
                  Approve
                </button>
                <button 
                  onClick={() => handleReview(eod.id, 'Reject')}
                  disabled={loading === eod.id}
                  className="text-red-600 hover:text-red-900 disabled:opacity-50"
                >
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
