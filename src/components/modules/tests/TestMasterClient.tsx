"use client";

import React, { useState, useTransition } from "react";
import { PageHeader } from "@/components/modules/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Beaker, FileText, XCircle, Pencil, Trash2, AlertTriangle, Loader2, Search, ChevronLeft, ChevronRight as ChevronRightIcon } from "lucide-react";
import { TestMaster } from "@/services/test.service";
import { AddTestWizard } from "./AddTestWizard";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { deleteTestMasterAction } from "@/actions/test.actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";

interface TestMasterClientProps {
  initialTests: TestMaster[];
}

export function TestMasterClient({ initialTests }: TestMasterClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<TestMaster | null>(null);
  const [deletingTest, setDeletingTest] = useState<TestMaster | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [nablFilter, setNablFilter] = useState<"all" | "nabl" | "non-nabl">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "Construction" | "Environmental">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, nablFilter, categoryFilter]);

  const handleEdit = (test: TestMaster) => {
    setEditingTest(test);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTest(null);
    router.refresh();
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
        router.refresh();
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

  const filteredTests = initialTests.filter(test => {
    if (nablFilter === "nabl" && test.is_nabl !== true) return false;
    if (nablFilter === "non-nabl" && test.is_nabl === true) return false;
    if (categoryFilter !== "all" && test.category !== categoryFilter) return false;

    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      test.discipline_group.toLowerCase().includes(query) ||
      test.material_product.toLowerCase().includes(query) ||
      test.component_parameter.toLowerCase().includes(query) ||
      test.test_method.toLowerCase().includes(query) ||
      (test.additional_details && test.additional_details.some(d => d.toLowerCase().includes(query)))
    );
  });

  const totalPages = Math.ceil(filteredTests.length / pageSize);
  const paginatedTests = filteredTests.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Test Master"
        subtitle="Manage all registered tests and methodologies"
        icon={Beaker}
        actions={
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64 group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
              </div>
              <Input
                type="text"
                placeholder="Search tests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-[40px] border-slate-200 bg-white hover:border-slate-300 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div className="w-full sm:w-[150px]">
              <Select
                value={nablFilter}
                onValueChange={(val) => setNablFilter(val as any)}
                buttonClassName="h-[40px] bg-white rounded-xl"
              >
                <SelectItem value="all">All NABL</SelectItem>
                <SelectItem value="nabl">NABL</SelectItem>
                <SelectItem value="non-nabl">NON-NABL</SelectItem>
              </Select>
            </div>
            <div className="w-full sm:w-[160px]">
              <Select
                value={categoryFilter}
                onValueChange={(val) => setCategoryFilter(val as any)}
                buttonClassName="h-[40px] bg-white rounded-xl"
              >
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Construction">Construction</SelectItem>
                <SelectItem value="Environmental">Environmental</SelectItem>
              </Select>
            </div>
            <Button
              variant="custom"
              size="none"
              onClick={() => setIsModalOpen(true)}
              className="h-[40px] bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-5 shadow-sm text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Test
            </Button>
          </div>
        }
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl my-auto">
            <Button
              variant="custom"
              size="none"
              onClick={handleCloseModal}
              className="absolute -top-3 -right-3 bg-white text-slate-500 hover:text-slate-800 border border-slate-200 shadow-md rounded-full p-1 z-10 transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </Button>
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

      {filteredTests.length > 0 ? (
        <div className="flex flex-col gap-4">
          {paginatedTests.map((test, index) => (
            <Card key={test.id} className="p-3 sm:p-4 relative rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-orange-200 transition-all duration-200 group overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-stretch gap-4">

                {/* Subtle Left Accent Line */}
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                {/* Left Column: Badge + Actions (Top Left) */}
                <div className="flex-shrink-0 flex flex-col justify-start items-center gap-2">
                  {/* S.No Badge */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-orange-500 to-orange-700 flex flex-col items-center justify-center shadow-[0_4px_8px_-2px_rgba(234,88,12,0.6)] border border-orange-400/50">
                    <span className="text-[8px] font-bold text-orange-100/90 uppercase tracking-widest leading-none mb-0.5">Test</span>
                    <span className="text-white font-black text-lg leading-none drop-shadow-sm">
                      {String((currentPage - 1) * pageSize + index + 1).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-row items-center justify-center gap-1.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <Button
                      variant="custom"
                      size="none"
                      onClick={() => handleEdit(test)}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 shadow-sm hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 hover:shadow transition-all"
                      title="Edit"
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="custom"
                      size="none"
                      onClick={() => setDeletingTest(test)}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 hover:shadow transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* 5 Column Grid */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-5 gap-3 items-start mt-0.5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Discipline / Group</span>
                    <span className="inline-block w-fit max-w-full px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-100/80 text-orange-700 font-semibold text-xs shadow-sm break-all">
                      {test.discipline_group}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Material / Product</span>
                    <span className="inline-block w-fit max-w-full px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700 font-medium text-xs shadow-sm break-all">
                      {test.material_product}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Component / Parameter</span>
                    <span className="inline-block w-fit max-w-full px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700 font-medium text-xs shadow-sm break-all">
                      {test.component_parameter}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Test Method</span>
                    <span className="inline-block w-fit max-w-full px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700 font-medium text-xs shadow-sm break-all">
                      {test.test_method}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Additional Details</span>
                    {test.additional_details && test.additional_details.length > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        {test.additional_details.map((detail, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-slate-600 text-sm leading-tight">
                            <span className="text-slate-400 mt-0.5">•</span>
                            <span className="break-all">{detail}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs italic">None</span>
                    )}
                  </div>
                </div>

              </div>
            </Card>
          ))}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-sm text-slate-500">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredTests.length)} of {filteredTests.length} entries
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </Button>
                <div className="flex items-center px-3 text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1"
                >
                  Next <ChevronRightIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card className="border-slate-200/60 shadow-sm border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">No tests found</h3>
            <p className="text-slate-500 text-center max-w-sm mb-6">
              There are no test masters registered yet. Get started by adding your first test methodology.
            </p>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Test
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
