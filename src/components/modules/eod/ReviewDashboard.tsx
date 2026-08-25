'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dropdown } from '@/components/ui/Dropdown';
import { Search, SlidersHorizontal, RefreshCcw, CheckCircle2, Clock, XCircle, AlertCircle, FileSearch, FileText } from 'lucide-react';
import { EODReport } from '@/services/eod.service';
import { reviewEODAction } from '@/actions/eod.actions';

type Employee = { id: string; first_name: string; last_name: string; employee_id: string };
type EnrichedEOD = EODReport & { profiles: Employee | null };

export function ReviewDashboard({
  initialEods,
  employees
}: {
  initialEods: EnrichedEOD[];
  employees: Employee[];
}) {
  const [eods, setEods] = useState<EnrichedEOD[]>(initialEods);
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEod, setSelectedEod] = useState<EnrichedEOD | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState('');

  const handleOpenModal = (eod: EnrichedEOD) => {
    setSelectedEod(eod);
    setIsRejecting(false);
    setRejectReason('');
    setActionError('');
  };

  const handleAction = async (action: 'Approve' | 'Reject') => {
    if (!selectedEod) return;
    
    if (action === 'Reject' && !isRejecting) {
      setIsRejecting(true);
      return;
    }

    if (action === 'Reject' && (!rejectReason || rejectReason.trim() === '')) {
      setActionError("Rejection reason is required");
      return;
    }

    setIsSubmitting(true);
    setActionError('');

    const formData = new FormData();
    formData.append('eod_id', selectedEod.id);
    formData.append('action', action);
    if (action === 'Reject') {
      formData.append('rejection_reason', rejectReason);
    }

    try {
      const res = await reviewEODAction(formData);
      if (res.success) {
        setEods(prev => prev.map(e => {
          if (e.id === selectedEod.id) {
            return { ...e, status: action === 'Approve' ? 'Approved' : 'Rejected' };
          }
          return e;
        }));
        setSelectedEod(null);
      } else {
        setActionError(res.error || "Failed to submit action");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError("An unexpected error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Client-side filtering logic
  const filteredEods = useMemo(() => {
    return eods.filter(eod => {
      // Employee filter
      if (selectedEmployee !== 'all' && eod.employee_id !== selectedEmployee) return false;

      // Date filters
      if (fromDate && eod.report_date < fromDate) return false;
      if (toDate && eod.report_date > toDate) return false;

      // Search filter
      if (search) {
        const s = search.toLowerCase();
        const matchesTasks = eod.tasks_accomplished?.toLowerCase().includes(s);
        const matchesBlockers = eod.blockers?.toLowerCase().includes(s);
        const matchesName = eod.profiles && (
          eod.profiles.first_name.toLowerCase().includes(s) ||
          eod.profiles.last_name.toLowerCase().includes(s)
        );
        if (!matchesTasks && !matchesBlockers && !matchesName) return false;
      }

      return true;
    });
  }, [eods, search, selectedEmployee, fromDate, toDate]);

  // Statistics
  const totalReports = filteredEods.length;
  const approved = filteredEods.filter(e => e.status === 'Approved').length;
  const pending = filteredEods.filter(e => e.status === 'Pending').length;
  const rejected = filteredEods.filter(e => e.status === 'Rejected').length; // mapped to "Not Submitted" or "Rejected" in the UI? The mockup says "Not Submitted", but EODs in DB are Pending/Approved/Rejected. We'll use Rejected for the red cross.

  const calcPercent = (val: number) => totalReports === 0 ? 0 : Math.round((val / totalReports) * 100 * 100) / 100;

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Clear filters
    setSearch('');
    setSelectedEmployee('all');
    setFromDate('');
    setToDate('');
    // In a real app we'd re-fetch from the server, but for now we just simulate it
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Filters Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4 text-slate-800">
          <SlidersHorizontal className="w-5 h-5 text-orange-600" />
          <h3 className="font-semibold">Filter Reports</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Employee</label>
            <Dropdown
              name="employee"
              value={selectedEmployee}
              onChange={val => setSelectedEmployee(val as string)}
              options={[
                { label: 'All Employees', value: 'all' },
                ...employees.map(emp => ({
                  label: `${emp.first_name} ${emp.last_name}`,
                  value: emp.id
                }))
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all outline-none"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">To</label>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all outline-none"
              />
            </div>
            <div className="pb-0.5 self-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleRefresh}
                className="h-[38px] px-4 bg-orange-50 border-orange-100 text-orange-700 hover:bg-orange-100 rounded-xl"
              >
                <RefreshCcw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-x divide-slate-100">

          <div className="flex items-center gap-4 px-2">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center border border-orange-100 flex-shrink-0">
              <FileText className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Reports</div>
              <div className="text-3xl font-bold text-slate-800">{totalReports}</div>
              <div className="text-xs text-slate-400 font-medium">Selected range</div>
            </div>
          </div>

          <div className="flex items-center gap-4 px-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100 flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved</div>
              <div className="text-3xl font-bold text-slate-800">{approved}</div>
              <div className="text-xs text-slate-400 font-medium">{calcPercent(approved)}%</div>
            </div>
          </div>

          <div className="flex items-center gap-4 px-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-100 flex-shrink-0">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending</div>
              <div className="text-3xl font-bold text-slate-800">{pending}</div>
              <div className="text-xs text-slate-400 font-medium">{calcPercent(pending)}%</div>
            </div>
          </div>

          <div className="flex items-center gap-4 px-6">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-100 flex-shrink-0">
              <XCircle className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rejected</div>
              <div className="text-3xl font-bold text-slate-800">{rejected}</div>
              <div className="text-xs text-slate-400 font-medium">{calcPercent(rejected)}%</div>
            </div>
          </div>

        </div>
      </div>

      {/* Data Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        {filteredEods.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-32 h-32 bg-orange-50 rounded-full flex items-center justify-center mb-6 relative border-4 border-white shadow-sm">
              <FileSearch className="w-16 h-16 text-orange-400 absolute" />
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">No Reports Found</h2>
            <p className="text-slate-500 max-w-sm mx-auto mb-6">
              Try adjusting your filters, search terms, or date range to find what you&apos;re looking for.
            </p>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setSearch('');
                setSelectedEmployee('all');
                setFromDate('');
                setToDate('');
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Hours</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEods.map((eod) => (
                    <tr key={eod.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">
                          {eod.profiles?.first_name} {eod.profiles?.last_name}
                        </div>
                        <div className="text-xs text-slate-500">{eod.profiles?.employee_id}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(eod.report_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md inline-flex items-center gap-1 ${eod.status === 'Approved' ? 'bg-emerald-100/80 text-emerald-700' :
                          eod.status === 'Rejected' ? 'bg-rose-100/80 text-rose-700' :
                            'bg-amber-100/80 text-amber-700'
                          }`}>
                          {eod.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{eod.location}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{eod.office_hours}h</td>
                      <td className="px-6 py-4">
                        <Button variant="ghost" size="sm" className="text-orange-600 hover:bg-orange-50" onClick={() => handleOpenModal(eod)}>
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      {selectedEod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                EOD Details
              </h2>

              <Button
                variant="ghost"
                onClick={() => setSelectedEod(null)}
              >
                Close
              </Button>
            </div>

            <div className="space-y-4">

              <div>
                <p className="text-xs text-slate-500">Employee</p>
                <p className="font-semibold">
                  {selectedEod.profiles?.first_name}{' '}
                  {selectedEod.profiles?.last_name}
                </p>
                <p className="text-sm text-slate-500">
                  {selectedEod.profiles?.employee_id}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Report Date</p>
                <p className="font-medium">
                  {new Date(selectedEod.report_date).toLocaleDateString()}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Status</p>
                <p className="font-medium">
                  {selectedEod.status}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Location</p>
                <p className="font-medium">
                  {selectedEod.location}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Office Hours</p>
                <p className="font-medium">
                  {selectedEod.office_hours} hours
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Tasks Accomplished
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {selectedEod.tasks_accomplished}
                </p>
              </div>

              {selectedEod.blockers && (
                <div>
                  <p className="text-xs text-slate-500">
                    Blockers
                  </p>
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedEod.blockers}
                  </p>
                </div>
              )}

            </div>

            {selectedEod.status === 'Pending' && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                {actionError && (
                  <div className="mb-4 text-sm text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-100">
                    {actionError}
                  </div>
                )}
                
                {isRejecting ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Rejection Reason</label>
                      <textarea 
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="w-full flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 resize-none"
                        rows={3}
                        placeholder="Please provide a reason for rejection..."
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button variant="ghost" onClick={() => setIsRejecting(false)} disabled={isSubmitting}>
                        Cancel
                      </Button>
                      <Button variant="danger" className="bg-rose-600 hover:bg-rose-700 text-white" onClick={() => handleAction('Reject')} isLoading={isSubmitting} disabled={isSubmitting}>
                        Confirm Rejection
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700" onClick={() => handleAction('Reject')} disabled={isSubmitting}>
                      Reject
                    </Button>
                    <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAction('Approve')} isLoading={isSubmitting} disabled={isSubmitting}>
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
