"use client";

import React, { useState, useTransition } from "react";
import { PageHeader } from "@/components/modules/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Beaker, FileText, XCircle, Pencil, Trash2, AlertTriangle, Loader2, Search, ChevronLeft, ChevronRight as ChevronRightIcon, Download, SlidersHorizontal, RefreshCcw } from "lucide-react";
import { TestMaster } from "@/services/test.service";
import { AddTestWizard } from "./AddTestWizard";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { deleteTestMasterAction } from "@/actions/test.actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/ScrollArea";

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
  const pageSize = 9;

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
          title: "Add Test Deleted",
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

  const handleExport = () => {
    import("xlsx").then((XLSX) => {
      const exportData = filteredTests.map((test, index) => ({
        "S.No": index + 1,
        "Test Method": test.test_method,
        "Discipline / Group": test.discipline_group,
        "Material / Product": test.material_product,
        "Component / Parameter": test.component_parameter,
        "Additional Details": test.additional_details?.join(", ") || "None",
        "NABL": test.is_nabl ? "Yes" : "No",
        "Category": test.category || "N/A",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Tests");

      XLSX.writeFile(workbook, "test_master.xlsx");
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
        title="Add Test"
        subtitle="Manage all registered tests and methodologies"
        icon={Beaker}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="none"
              onClick={handleExport}
              className="h-[40px] rounded-xl px-4 shadow-sm text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
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

      {/* Filter Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-md bg-orange-50 flex items-center justify-center">
            <SlidersHorizontal className="w-3.5 h-3.5 text-orange-600" />
          </div>
          <h3 className="font-bold text-slate-800 text-[15px]">Filter Tests</h3>
        </div>
        
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Search</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
              </div>
              <Input
                type="text"
                placeholder="Search tests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-[40px] border-slate-200 bg-white hover:border-slate-300 focus:ring-orange-500/20 focus:border-orange-500 rounded-xl"
              />
            </div>
          </div>
          
          <div className="flex-1 w-full space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">NABL Status</label>
            <Select
              value={nablFilter}
              onValueChange={(val) => setNablFilter(val as any)}
              buttonClassName="h-[40px] bg-white rounded-xl border-slate-200 hover:border-slate-300"
            >
              <SelectItem value="all">All NABL</SelectItem>
              <SelectItem value="nabl">NABL</SelectItem>
              <SelectItem value="non-nabl">NON-NABL</SelectItem>
            </Select>
          </div>
          
          <div className="flex-1 w-full space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Category</label>
            <Select
              value={categoryFilter}
              onValueChange={(val) => setCategoryFilter(val as any)}
              buttonClassName="h-[40px] bg-white rounded-xl border-slate-200 hover:border-slate-300"
            >
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Construction">Construction</SelectItem>
              <SelectItem value="Environmental">Environmental</SelectItem>
            </Select>
          </div>

          <Button
            variant="outline"
            size="none"
            onClick={() => {
              setSearchQuery("");
              setNablFilter("all");
              setCategoryFilter("all");
            }}
            className="h-[40px] px-5 rounded-xl border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 hover:text-orange-700 font-semibold shadow-sm flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <RefreshCcw className="w-4 h-4" /> Refresh
          </Button>
        </div>
      </div>

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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {paginatedTests.map((test, index) => (
              <Card key={test.id} className="group relative flex flex-col h-full bg-white rounded-xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-orange-300/60 transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="p-3 flex-1 flex flex-col">
                  {/* Header: Badges & Actions */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200/50 text-[10px] font-extrabold tracking-wider shadow-sm uppercase">
                        TEST {String((currentPage - 1) * pageSize + index + 1).padStart(2, '0')}
                      </span>
                      {test.is_nabl && (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/50 text-[10px] font-extrabold tracking-wider shadow-sm uppercase">
                          NABL
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200 -mt-1 -mr-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(test)}
                        className="h-6 w-6 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingTest(test)}
                        className="h-6 w-6 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-[15px] font-extrabold text-slate-900 leading-snug mb-1 line-clamp-2">
                    {test.test_method || "Unknown Test Method"}
                  </h3>
                  <p className="text-[13px] font-semibold text-slate-600 mb-2">
                    {test.is_nabl !== false 
                      ? (test.component_parameter || "Unknown Component") 
                      : (test.particulars || "Unknown Particulars")}
                  </p>

                  {/* Details Grid */}
                  <div className="grid gap-1.5 mb-2 flex-1">
                    {test.is_nabl !== false ? (
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="bg-slate-50/80 rounded-md p-1.5 border border-slate-100 min-w-0">
                          <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block mb-0.5 truncate">Discipline</span>
                          <span className="text-xs font-bold text-slate-800 truncate block" title={test.discipline_group}>{test.discipline_group || "-"}</span>
                        </div>
                        <div className="bg-slate-50/80 rounded-md p-1.5 border border-slate-100 min-w-0">
                          <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block mb-0.5 truncate">Material</span>
                          <span className="text-xs font-bold text-slate-800 truncate block" title={test.material_product}>{test.material_product || "-"}</span>
                        </div>
                        <div className="bg-slate-50/80 rounded-md p-1.5 border border-slate-100 min-w-0">
                          <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block mb-0.5 truncate">Component</span>
                          <span className="text-xs font-bold text-slate-800 truncate block" title={test.component_parameter}>{test.component_parameter || "-"}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="bg-orange-50/50 rounded-md p-1.5 border border-orange-100/50 min-w-0 col-span-1">
                          <span className="text-[9px] font-extrabold text-orange-600 uppercase tracking-widest block mb-0.5 truncate">Particulars</span>
                          <span className="text-xs font-bold text-orange-950 truncate block" title={test.particulars || undefined}>{test.particulars || "-"}</span>
                        </div>
                        <div className="bg-slate-50/80 rounded-md p-1.5 border border-slate-100 min-w-0">
                          <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block mb-0.5 truncate">Unit</span>
                          <span className="text-xs font-bold text-slate-800 truncate block" title={test.unit || undefined}>{test.unit || "-"}</span>
                        </div>
                        <div className="bg-slate-50/80 rounded-md p-1.5 border border-slate-100 min-w-0">
                          <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block mb-0.5 truncate">Sample Size</span>
                          <span className="text-xs font-bold text-slate-800 truncate block" title={test.sample_size || undefined}>{test.sample_size || "-"}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer: Additional Details */}
                  <div className="pt-2 border-t border-slate-100 mt-auto">
                    <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block mb-1 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Additional Details
                    </span>
                    {test.additional_details && test.additional_details.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {test.additional_details.map((detail, idx) => (
                          <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-slate-700 bg-slate-100/80 border border-slate-200/60 text-[11px] font-bold">
                            {detail}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500 font-medium text-[11px] italic">No additional details provided.</span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-sm text-slate-500">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredTests.length)} of {filteredTests.length} entries
              </span>
              <div className="flex gap-2">
                <Button
                  variant="custom"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1.5 px-4 h-9 rounded-full bg-white border border-slate-200 text-slate-600 font-medium hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all shadow-sm disabled:opacity-50 disabled:pointer-events-none"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </Button>
                <div className="flex items-center px-4 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-sm font-semibold text-slate-700 shadow-sm">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="custom"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1.5 px-4 h-9 rounded-full bg-white border border-slate-200 text-slate-600 font-medium hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all shadow-sm disabled:opacity-50 disabled:pointer-events-none"
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
