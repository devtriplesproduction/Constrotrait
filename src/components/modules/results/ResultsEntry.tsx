"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getResultRowsAction, saveResultRowsAction } from "@/actions/test-result.actions";
import { TestResultRow } from "@/types/lims";

const emptyRow = (testId: string, n: number): TestResultRow => ({
  job_entry_test_id: testId,
  sr_no: n,
  id_mark: "",
  length_mm: null,
  width_mm: null,
  area_mm2: null,
  load_kn: null,
  strength_nmm2: null,
  particulars: "",
  result_value: "",
  specified_value: "",
});


export function ResultsEntry({ initialTests, loadError }: { initialTests: any[]; loadError: string | null }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [rows, setRows] = useState<TestResultRow[]>([]);
  const [busy, setBusy] = useState(false);

  const open = async (id: string) => {
    setSelected(id);
    setBusy(true);
    const res = await getResultRowsAction(id);
    setBusy(false);
    if (!res.success) {
      alert(res.error);
      return;
    }
    setRows(res.data && res.data.length ? (res.data as any) : [emptyRow(id, 1), emptyRow(id, 2), emptyRow(id, 3)]);
  };

  const save = async () => {
    if (!selected) return;
    setBusy(true);
    const res = await saveResultRowsAction(selected, rows);
    setBusy(false);
    alert(res.success ? "Results saved" : res.error);
  };

  const setCell = (i: number, key: keyof TestResultRow, value: string) => {
    setRows((prev) => prev.map((r, idx) => {
      if (idx !== i) return r;
      if (["length_mm", "width_mm", "area_mm2", "load_kn", "strength_nmm2"].includes(key as string)) {
        return { ...r, [key]: value === "" ? null : Number(value) };
      }
      return { ...r, [key]: value };
    }));
  };

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Sample results</h1>
      <p className="text-sm text-slate-500 mb-4">Enter cube / chemical values before issuing a TEST REPORT.</p>
      {loadError && <p className="text-red-600 text-sm mb-3">{loadError}</p>}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="border rounded-xl bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-3 py-2">UID</th>
                <th className="text-left px-3 py-2">Test</th>
                <th className="text-left px-3 py-2">NABL</th>
              </tr>
            </thead>
            <tbody>
              {initialTests.map((t) => (
                <tr key={t.id} className={`cursor-pointer hover:bg-orange-50 ${selected === t.id ? "bg-orange-50" : ""}`} onClick={() => open(t.id)}>
                  <td className="px-3 py-2">{t.uid_label || "UID missing"}</td>
                  <td className="px-3 py-2">{t.test_master?.specific_test || t.test_master?.component_parameter}</td>
                  <td className="px-3 py-2">{t.test_master?.is_nabl ? "NABL" : "Non-NABL"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border rounded-xl bg-white p-4">
          {!selected ? <p className="text-slate-500 text-sm">Select a test.</p> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border">
                  <thead className="bg-slate-100">
                    <tr>
                      {"Sr,ID mark,L mm,W mm,Area,Load kN,N/mm2,Particulars,Result,Specified".split(",").map((h) => (
                        <th key={h} className="border px-1 py-1">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td className="border px-1">{r.sr_no}</td>
                        <td className="border"><input className="w-16 px-1" value={r.id_mark || ""} onChange={(e) => setCell(i, "id_mark", e.target.value)} /></td>
                        <td className="border"><input className="w-14 px-1" value={r.length_mm ?? ""} onChange={(e) => setCell(i, "length_mm", e.target.value)} /></td>
                        <td className="border"><input className="w-14 px-1" value={r.width_mm ?? ""} onChange={(e) => setCell(i, "width_mm", e.target.value)} /></td>
                        <td className="border"><input className="w-14 px-1" value={r.area_mm2 ?? ""} onChange={(e) => setCell(i, "area_mm2", e.target.value)} /></td>
                        <td className="border"><input className="w-14 px-1" value={r.load_kn ?? ""} onChange={(e) => setCell(i, "load_kn", e.target.value)} /></td>
                        <td className="border"><input className="w-14 px-1" value={r.strength_nmm2 ?? ""} onChange={(e) => setCell(i, "strength_nmm2", e.target.value)} /></td>
                        <td className="border"><input className="w-20 px-1" value={r.particulars || ""} onChange={(e) => setCell(i, "particulars", e.target.value)} /></td>
                        <td className="border"><input className="w-16 px-1" value={r.result_value || ""} onChange={(e) => setCell(i, "result_value", e.target.value)} /></td>
                        <td className="border"><input className="w-16 px-1" value={r.specified_value || ""} onChange={(e) => setCell(i, "specified_value", e.target.value)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => selected && setRows((r) => [...r, emptyRow(selected, r.length + 1)])}>Add row</Button>
                <Button size="sm" disabled={busy} onClick={save} className="bg-orange-500 hover:bg-orange-600 text-white">Save results</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
