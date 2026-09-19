"use client";

import React, { useState, useTransition } from "react";
import { PageHeader } from "@/components/modules/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Beaker, FileText, XCircle, Pencil, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { TestMaster } from "@/services/test.service";
import { AddTestWizard } from "./AddTestWizard";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { deleteTestMasterAction } from "@/actions/test.actions";
import { useToast } from "@/hooks/use-toast";

interface TestMasterClientProps {
  initialTests: TestMaster[];
}

export function TestMasterClient({ initialTests }: TestMasterClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<TestMaster | null>(null);
  const [deletingTest, setDeletingTest] = useState<TestMaster | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleEdit = (test: TestMaster) => {
    setEditingTest(test);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTest(null);
  };

  const handleDelete = () => {
    if (!deletingTest) return;
    
    startTransition(async () => {
      const result = await deleteTestMasterAction(deletingTest.id);
      if (result.success) {
        toast({
          title: "Test Master Deleted",
          description: "The test has been successfully deleted.",
        });
      } else {
        toast({
          variant: "error",
          title: "Error",
          description: result.error || "Failed to delete test master",
        });
      }
      setDeletingTest(null);
    });
  };

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
              onClick={handleCloseModal}
              className="absolute -top-4 -right-4 bg-zinc-800 text-zinc-400 hover:text-white rounded-full p-2 z-10"
            >
              <XCircle className="w-6 h-6" />
            </button>
            <AddTestWizard onSuccess={handleCloseModal} initialData={editingTest || undefined} />
          </div>
        </div>
      )}

      {deletingTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-slate-200">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4 mx-auto">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-center text-slate-900 mb-2">Delete Test Master</h3>
            <p className="text-center text-slate-600 mb-6">
              Are you sure you want to delete <span className="font-semibold text-slate-900">{deletingTest.serial_no}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => setDeletingTest(null)} disabled={isPending}>
                Cancel
              </Button>
              <Button onClick={handleDelete} disabled={isPending} className="bg-red-600 hover:bg-red-700 text-white">
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
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
                  <th className="px-6 py-4 font-semibold">Additional Details</th>
                  <th className="px-6 py-4 font-semibold text-right sticky right-0 bg-slate-50 z-10 shadow-[-4px_0_12px_rgba(0,0,0,0.05)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initialTests.length > 0 ? (
                  initialTests.map((test) => (
                    <tr key={test.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 font-medium text-slate-900">{test.serial_no}</td>
                      <td className="px-6 py-4 text-slate-600">{test.discipline_group}</td>
                      <td className="px-6 py-4 text-slate-600">{test.material_product}</td>
                      <td className="px-6 py-4 text-slate-600">{test.component_parameter}</td>
                      <td className="px-6 py-4 text-slate-600">{test.test_method}</td>
                      <td className="px-6 py-4">
                        {test.additional_details && test.additional_details.length > 0 ? (
                          <ul className="list-disc list-inside text-slate-600 space-y-1">
                            {test.additional_details.map((detail, idx) => (
                              <li key={idx} className="text-sm">{detail}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-slate-400 text-xs italic">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right sticky right-0 bg-white group-hover:bg-slate-50 shadow-[-4px_0_12px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(test)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingTest(test)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-base font-medium text-slate-900">No tests found</p>
                        <p className="mt-1">Click &quot;Add Test&quot; to register a new test master.</p>
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
