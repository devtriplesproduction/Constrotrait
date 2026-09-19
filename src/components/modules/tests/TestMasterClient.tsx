"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/modules/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Beaker, FileText, CheckCircle2, XCircle } from "lucide-react";
import { TestMaster } from "@/services/test.service";
import { AddTestWizard } from "./AddTestWizard";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

interface TestMasterClientProps {
  initialTests: TestMaster[];
}

export function TestMasterClient({ initialTests }: TestMasterClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Test Master"
        subtitle="Manage all registered tests and methodologies"
        icon={Beaker}
        actions={
          <Button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Test
          </Button>
        }
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl my-auto">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute -top-4 -right-4 bg-zinc-800 text-zinc-400 hover:text-white rounded-full p-2 z-10"
            >
              <XCircle className="w-6 h-6" />
            </button>
            <AddTestWizard onSuccess={() => setIsModalOpen(false)} />
          </div>
        </div>
      )}

      <Card className="border-slate-200/60 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-50/80 uppercase border-b border-slate-200/60">
                <tr>
                  <th className="px-6 py-4 font-semibold">S.No</th>
                  <th className="px-6 py-4 font-semibold">Discipline / Group</th>
                  <th className="px-6 py-4 font-semibold">Material / Product</th>
                  <th className="px-6 py-4 font-semibold">Component / Parameter</th>
                  <th className="px-6 py-4 font-semibold">Test Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initialTests.length > 0 ? (
                  initialTests.map((test) => (
                    <tr key={test.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{test.serial_no}</td>
                      <td className="px-6 py-4 text-slate-600">{test.discipline_group}</td>
                      <td className="px-6 py-4 text-slate-600">{test.material_product}</td>
                      <td className="px-6 py-4 text-slate-600">{test.component_parameter}</td>
                      <td className="px-6 py-4 text-slate-600">{test.test_method}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-base font-medium text-slate-900">No tests found</p>
                        <p className="mt-1">Click "Add Test" to register a new test master.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
