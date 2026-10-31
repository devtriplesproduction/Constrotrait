"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Receipt,
  IndianRupee,
  Building2,
  Calendar,
  Loader2,
  AlertTriangle,
  Package,
  Layers,
  Landmark,
  CreditCard,
  User,
  FlaskConical,
  CheckCircle2,
  Search,
  Sparkles,
  Info,
  ChevronRight,
  ShieldAlert,
  RotateCcw,
  HardHat,
  Leaf,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { createExpenseAction } from "@/actions/accounting.actions";

const APPROVAL_THRESHOLD = 100000;

interface RecordExpensePageClientProps {
  initialInwards: any[];
  categories: any[];
  accounts: any[];
  projects: any[];
  initialInward?: any;
  initialTestId?: string;
  initialType?: string;
  testMasters?: any[];
}

export function RecordExpensePageClient({
  initialInwards,
  categories,
  accounts,
  projects,
  initialInward,
  initialTestId,
  initialType,
  testMasters = [],
}: RecordExpensePageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const queryType = (searchParams.get("type") || initialType) as "inward" | "test" | "inhouse" | "company" | null;
  const queryCategory = searchParams.get("category") as "Construction" | "Environmental" | null;
  const queryInwardId = searchParams.get("inward_id") || initialInward?.id || "";
  const queryTestId = searchParams.get("test_id") || initialTestId || "";
  const returnUrl = searchParams.get("return_url") || "/accounting/test-financials";

  // Helper to find test in an inward by id or test_master_id
  const findMatchingTest = useCallback((inv: any, tid: string) => {
    if (!inv || !tid || !inv.job_entry_tests) return null;
    return (
      inv.job_entry_tests.find((t: any) => t.id === tid) ||
      inv.job_entry_tests.find((t: any) => t.test_master_id === tid) ||
      inv.job_entry_tests.find((t: any) => t.test_master?.id === tid) ||
      null
    );
  }, []);

  type ExpenseScope = "inward_cost" | "test_expense" | "inhouse" | "company";

  const isInitiallyTest = queryType === "test" || Boolean(queryTestId);

  const [selectedScope, setSelectedScope] = useState<ExpenseScope>(() => {
    if (queryType === "inhouse") return "inhouse";
    if (queryType === "company") return "company";
    if (isInitiallyTest) return "test_expense";
    return "inward_cost";
  });

  const [selectedCategory, setSelectedCategory] = useState<"Construction" | "Environmental">(() => {
    if (queryCategory === "Construction" || queryCategory === "Environmental") {
      return queryCategory;
    }
    const tm = (testMasters || []).find((m: any) => m.id === queryTestId);
    if (tm?.category === "Environmental" || tm?.category === "Construction") {
      return tm.category;
    }
    return "Construction";
  });

  const [expenseType, setExpenseType] = useState<"inward" | "test" | "inhouse" | "company">(() => {
    if (queryType === "inhouse" || queryType === "company" || queryType === "test") {
      return queryType;
    }
    if (isInitiallyTest) return "test";
    return "inward";
  });

  // Never connect inwardId for individual test expenses
  const [inwardId, setInwardId] = useState<string>(() => {
    if (isInitiallyTest) return "";
    return queryInwardId;
  });
  const [inwardSearch, setInwardSearch] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form state
  const [form, setForm] = useState(() => {
    const matchedMaster = (testMasters || []).find((m: any) => m.id === queryTestId);
    const testCategory = matchedMaster?.category || queryCategory || "Construction";
    const testName = matchedMaster
      ? matchedMaster.specific_test || matchedMaster.component_parameter || "Specific Test"
      : "";

    const matchedInward = !isInitiallyTest
      ? (initialInwards.find((i) => i.id === queryInwardId) || initialInward)
      : null;

    return {
      amount: "",
      expense_date: new Date().toISOString().slice(0, 10),
      category_id: "",
      account_id: accounts.length > 0 ? accounts[0].id : "",
      payment_mode: "bank",
      vendor_name: "",
      paid_through_person: "",
      bill_number: "",
      bill_attached: false,
      is_reimbursement: false,
      project_id: "",
      site_name: matchedInward?.project_name || matchedInward?.clients?.site_name || "",
      department: isInitiallyTest ? `${testCategory} Department` : "Construction Department",
      description: testName
        ? `Direct test expense for: [${testCategory}] ${testName}`
        : matchedInward
        ? `Direct expense for Inward UID: ${matchedInward.uid_label || matchedInward.uid}`
        : "",
      gst_amount: "",
      tds_amount: "",
      job_entry_test_id: queryTestId || "",
    };
  });

  const setField = (k: string, v: any) => setForm((prev) => ({ ...prev, [k]: v }));

  // Keep test selection synchronized when URL params or test masters load
  useEffect(() => {
    if (selectedScope === "test_expense") {
      setInwardId("");
      if (queryTestId) {
        const tm = (testMasters || []).find((m: any) => m.id === queryTestId);
        if (tm) {
          const cat = (tm.category as "Construction" | "Environmental") || "Construction";
          const testName = tm.specific_test || tm.component_parameter || "Test";
          setSelectedCategory(cat);
          setForm((prev) => ({
            ...prev,
            job_entry_test_id: tm.id,
            department: `${cat} Department`,
            description:
              prev.description && !prev.description.includes("Direct test expense")
                ? prev.description
                : `Direct test expense for: [${cat}] ${testName}`,
          }));
        }
      }
      return;
    }

    const matched = initialInwards.find((i) => i.id === queryInwardId) || initialInward;
    if (queryInwardId && !inwardId) {
      setInwardId(queryInwardId);
    }
  }, [selectedScope, queryInwardId, queryTestId, inwardId, initialInward, initialInwards, testMasters]);

  // Find currently selected inward
  const selectedInward = useMemo(() => {
    return initialInwards.find((i) => i.id === inwardId) || initialInward || null;
  }, [inwardId, initialInwards, initialInward]);

  // Find selected test
  const selectedTest = useMemo(() => {
    if (!form.job_entry_test_id) return null;
    if (selectedInward?.job_entry_tests) {
      const foundInwardTest = selectedInward.job_entry_tests.find((t: any) =>
        t.id === form.job_entry_test_id ||
        t.test_master_id === form.job_entry_test_id ||
        t.test_master?.id === form.job_entry_test_id
      );
      if (foundInwardTest) return foundInwardTest;
    }
    const foundMaster = (testMasters || []).find((tm: any) => tm.id === form.job_entry_test_id);
    if (foundMaster) {
      return { id: foundMaster.id, test_master: foundMaster };
    }
    return null;
  }, [selectedInward, form.job_entry_test_id, testMasters]);

  // Tests belonging to selectedCategory for Test Expense tab (Individual master tests, NO inward/job card links)
  const categoryTestsList = useMemo(() => {
    const list: Array<{ id: string; name: string; displayName: string; rawTest?: any }> = [];
    const seen = new Set<string>();

    // 1. All master tests from testMasters matching selectedCategory
    (testMasters || []).forEach((tm: any) => {
      const cat = tm.category || "Construction";
      if (cat === selectedCategory && !seen.has(tm.id)) {
        const name = tm.specific_test || tm.component_parameter || "Test Parameter";
        const mat = tm.material_product || tm.discipline_group || "";
        list.push({
          id: tm.id,
          name,
          displayName: `${name} ${mat ? `[${mat}]` : ""}`.trim(),
          rawTest: tm,
        });
        seen.add(tm.id);
      }
    });

    // 2. Fallback: extract distinct tests from inwards without inward/job card links
    if (list.length === 0) {
      initialInwards.forEach((inv) => {
        (inv.job_entry_tests || []).forEach((t: any) => {
          const tm = t.test_master;
          const cat = tm?.category || "Construction";
          const testId = tm?.id || t.id;
          if (cat === selectedCategory && !seen.has(testId)) {
            const name =
              tm?.specific_test ||
              tm?.component_parameter ||
              t.material_description ||
              "Test";
            const mat = tm?.material_product || tm?.discipline_group || "";
            list.push({
              id: testId,
              name,
              displayName: `${name} ${mat ? `[${mat}]` : ""}`.trim(),
              rawTest: tm || t,
            });
            seen.add(testId);
          }
        });
      });
    }

    return list;
  }, [selectedCategory, testMasters, initialInwards]);

  // Selected account metadata
  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === form.account_id) || null;
  }, [form.account_id, accounts]);

  // Filter categories by type
  const inwardCategories = useMemo(
    () =>
      categories.filter(
        (c) =>
          c.name.toLowerCase().includes("sample") ||
          c.name.toLowerCase().includes("testing") ||
          c.name.toLowerCase().includes("freight") ||
          c.name.toLowerCase().includes("lab") ||
          c.name.toLowerCase().includes("site") ||
          c.name.toLowerCase().includes("machinery") ||
          c.name.toLowerCase().includes("contractor") ||
          c.name.toLowerCase().includes("labour") ||
          c.name.toLowerCase().includes("material") ||
          c.scope === "site"
      ),
    [categories]
  );

  const inhouseCategories = useMemo(
    () =>
      categories.filter(
        (c) =>
          c.name.toLowerCase().includes("calibration") ||
          c.name.toLowerCase().includes("chemical") ||
          c.name.toLowerCase().includes("consumable") ||
          c.name.toLowerCase().includes("proficiency") ||
          c.name.toLowerCase().includes("ilc") ||
          c.name.toLowerCase().includes("spares") ||
          c.name.toLowerCase().includes("curing") ||
          c.name.toLowerCase().includes("power") ||
          c.name.toLowerCase().includes("safety") ||
          c.name.toLowerCase().includes("ppe") ||
          c.name.toLowerCase().includes("amc") ||
          c.name.toLowerCase().includes("testing")
      ),
    [categories]
  );

  const companyCategories = useMemo(
    () =>
      categories.filter(
        (c) =>
          c.name.toLowerCase().includes("salaries") ||
          c.name.toLowerCase().includes("rent") ||
          c.name.toLowerCase().includes("electricity") ||
          c.name.toLowerCase().includes("stationery") ||
          c.name.toLowerCase().includes("software") ||
          c.name.toLowerCase().includes("pantry") ||
          c.name.toLowerCase().includes("maintenance") ||
          c.name.toLowerCase().includes("legal") ||
          c.name.toLowerCase().includes("consultant") ||
          c.name.toLowerCase().includes("travel") ||
          c.name.toLowerCase().includes("department") ||
          c.scope === "branch" ||
          c.scope === "department"
      ),
    [categories]
  );

  const displayedCategories = useMemo(() => {
    if (expenseType === "inward") return inwardCategories.length > 0 ? inwardCategories : categories;
    if (expenseType === "inhouse") return inhouseCategories.length > 0 ? inhouseCategories : categories;
    return companyCategories.length > 0 ? companyCategories : categories;
  }, [expenseType, inwardCategories, inhouseCategories, companyCategories, categories]);

  // Filter inwards for dropdown
  const filteredInwardOptions = useMemo(() => {
    if (!inwardSearch.trim()) return initialInwards;
    const q = inwardSearch.toLowerCase();
    return initialInwards.filter((item) => {
      const uidStr = String(item.uid_label || item.uid || "").toLowerCase();
      const clientStr = (item.clients?.name || "").toLowerCase();
      const projectStr = (item.project_name || "").toLowerCase();
      return uidStr.includes(q) || clientStr.includes(q) || projectStr.includes(q);
    });
  }, [initialInwards, inwardSearch]);

  const numAmount = Number(form.amount || 0);
  const numGst = Number(form.gst_amount || 0);
  const numTds = Number(form.tds_amount || 0);
  const netPayable = Math.max(0, numAmount + numGst - numTds);

  const requiresApproval =
    numAmount > APPROVAL_THRESHOLD ||
    (form.is_reimbursement && !form.bill_attached && numAmount >= 500);

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.amount || Number(form.amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter an expense amount greater than ₹0.00.",
        variant: "error",
      });
      return;
    }

    if (selectedScope === "inward_cost" && !inwardId) {
      toast({
        title: "Inward Selection Required",
        description: "Please select an Inward Job UID for this inward direct expense.",
        variant: "error",
      });
      return;
    }

    if (selectedScope === "test_expense" && !form.job_entry_test_id) {
      toast({
        title: "Test Name Required",
        description: "Please select a test name for this individual test expense.",
        variant: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const isTestScope = selectedScope === "test_expense";
      const payload = {
        ...form,
        amount: Number(form.amount),
        gst_amount: Number(form.gst_amount || 0),
        tds_amount: Number(form.tds_amount || 0),
        expense_type: isTestScope ? "test" : expenseType,
        inward_id: isTestScope ? null : (expenseType === "inward" ? inwardId : null),
        job_entry_test_id: null,
        test_master_id: isTestScope ? (form.job_entry_test_id || null) : null,
        is_general_expense: expenseType === "company",
        project_id: isTestScope ? null : (form.project_id || null),
        category_id: form.category_id || null,
        account_id: form.account_id || null,
      };

      const res = await createExpenseAction(payload);

      if (res.success) {
        toast({
          title: "Expense Successfully Recorded",
          description: `${
            isTestScope
              ? "Individual Test"
              : expenseType === "inward"
              ? "Inward Direct Job"
              : expenseType === "inhouse"
              ? "In-House Lab"
              : "Company"
          } expense of ₹${Number(form.amount).toLocaleString("en-IN")} recorded. ${
            requiresApproval ? "Pending managerial approval." : "Posted to ledgers."
          }`,
        });

        // Navigate back to origin with smooth refresh
        router.push(returnUrl);
        router.refresh();
      } else {
        toast({
          title: "Recording Failed",
          description: res.error || "Could not record expense entry.",
          variant: "error",
        });
        setIsSubmitting(false);
      }
    } catch (err: any) {
      toast({
        title: "Unexpected Error",
        description: err.message || "An unexpected error occurred.",
        variant: "error",
      });
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm({
      amount: "",
      expense_date: new Date().toISOString().slice(0, 10),
      category_id: "",
      account_id: accounts.length > 0 ? accounts[0].id : "",
      payment_mode: "bank",
      vendor_name: "",
      paid_through_person: "",
      bill_number: "",
      bill_attached: false,
      is_reimbursement: false,
      project_id: "",
      site_name: "",
      department: "",
      description: "",
      gst_amount: "",
      tds_amount: "",
      job_entry_test_id: "",
    });
  };

  return (
    <div className="w-full space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Breadcrumb & Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Link
              href="/accounting"
              className="hover:text-indigo-600 transition-colors"
            >
              Accounting
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Link
              href="/accounting/test-financials"
              className="hover:text-indigo-600 transition-colors"
            >
              Test Financials
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-900 font-bold">Record Expense</span>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Record Operational & Laboratory Expense
            </h1>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                selectedScope === "inward_cost"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : selectedScope === "test_expense"
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                  : selectedScope === "inhouse"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-purple-50 text-purple-700 border-purple-200"
              }`}
            >
              {selectedScope === "inward_cost"
                ? "📦 INWARD DIRECT COST"
                : selectedScope === "test_expense"
                ? "🧪 TEST EXPENSE"
                : selectedScope === "inhouse"
                ? "🔬 IN-HOUSE LAB OVERHEAD"
                : "🏢 COMPANY OVERHEAD"}
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Allocate direct operational testing costs to specific job UIDs and test methods, log internal laboratory capacity charges (reagents, calibration), or record company overheads.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            onClick={() => router.push(returnUrl)}
            className="h-9 px-4 text-xs font-semibold rounded-xl text-slate-700 hover:text-slate-900 border-slate-200 gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleReset}
            className="h-9 px-3 text-xs text-slate-500 hover:text-slate-800 rounded-xl gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </Button>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Comprehensive Form Cards (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Expense Scope & Allocation */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Step 1: Expense Scope & Cost Center
                  </h2>
                  <p className="text-xs text-slate-500">
                    Choose how this expense is allocated in financial accounts and unit economics.
                  </p>
                </div>
              </div>
            </div>

            {/* 4 Scope Allocation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Card 1: Inward Direct Cost */}
              <button
                type="button"
                onClick={() => {
                  setSelectedScope("inward_cost");
                  setExpenseType("inward");
                }}
                className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  selectedScope === "inward_cost"
                    ? "bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`p-2 rounded-lg ${
                      selectedScope === "inward_cost"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Package className="w-5 h-5" />
                  </div>
                  {selectedScope === "inward_cost" ? (
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Inward Job
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Inward Direct Cost</div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Directly related to a specific inward Job UID (freight, sampling, site handling, or shared job cost).
                  </p>
                </div>
              </button>

              {/* Card 2: Test Expense (Individual Test - No Inward Connection) */}
              <button
                type="button"
                onClick={() => {
                  setSelectedScope("test_expense");
                  setExpenseType("test");
                  setInwardId("");
                  setField("department", `${selectedCategory} Department`);
                }}
                className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  selectedScope === "test_expense"
                    ? "bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`p-2 rounded-lg ${
                      selectedScope === "test_expense"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <FlaskConical className="w-5 h-5" />
                  </div>
                  {selectedScope === "test_expense" ? (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Direct Test
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Test Expense</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Select category (Construction / Environmental) and test name to add expense to that test.
                  </p>
                </div>
              </button>

              {/* Card 3: In-House Lab Operations */}
              <button
                type="button"
                onClick={() => {
                  setSelectedScope("inhouse");
                  setExpenseType("inhouse");
                  setInwardId("");
                  setField("job_entry_test_id", "");
                }}
                className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  selectedScope === "inhouse"
                    ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`p-2 rounded-lg ${
                      selectedScope === "inhouse"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Layers className="w-5 h-5" />
                  </div>
                  {selectedScope === "inhouse" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Lab Capacity
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">In-House Lab Operations</div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    NABL calibration, reagents, consumables, equipment spares, power.
                  </p>
                </div>
              </button>

              {/* Card 4: Company Overhead */}
              <button
                type="button"
                onClick={() => {
                  setSelectedScope("company");
                  setExpenseType("company");
                  setInwardId("");
                  setField("job_entry_test_id", "");
                }}
                className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  selectedScope === "company"
                    ? "bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20 shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`p-2 rounded-lg ${
                      selectedScope === "company"
                        ? "bg-purple-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                  {selectedScope === "company" ? (
                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Overhead
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Company Overhead</div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Office rent, administrative salaries, electricity, tea/pantry, audit.
                  </p>
                </div>
              </button>
            </div>

            {/* Scope 1: INWARD DIRECT COST */}
            {selectedScope === "inward_cost" && (
              <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-200 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-blue-600" />
                      <span>Select Target Inward Job UID</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    {selectedInward && (
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        UID: {selectedInward.uid_label || selectedInward.uid}
                      </span>
                    )}
                  </div>

                  {initialInward ? (
                    <div className="p-3.5 bg-white rounded-xl border border-blue-200 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Job UID: {initialInward.uid_label || initialInward.uid}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Client: {initialInward.clients?.name || "N/A"} · Project: {initialInward.project_name || "N/A"}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                        Pre-selected from Test Financials
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <select
                        required
                        value={inwardId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setInwardId(id);
                          const inv = initialInwards.find((i) => i.id === id);
                          if (inv) {
                            setForm((prev) => ({
                              ...prev,
                              job_entry_test_id: "",
                              site_name: inv.project_name || inv.clients?.site_name || prev.site_name,
                              description: prev.description || `Direct expense for Inward UID: ${inv.uid_label || inv.uid}`,
                            }));
                          }
                        }}
                        className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                      >
                        <option value="">— Select an Inward Job UID —</option>
                        {filteredInwardOptions.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            UID: {inv.uid_label || inv.uid} — {inv.clients?.name || "Client"} ({inv.project_name || "Project"})
                          </option>
                        ))}
                      </select>

                      {initialInwards.length > 5 && (
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Type to filter Inward by UID or Client..."
                            value={inwardSearch}
                            onChange={(e) => setInwardSearch(e.target.value)}
                            className="w-full h-8 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 outline-none focus:border-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Specific Test Parameter Tagging for Inward */}
                {selectedInward?.job_entry_tests && selectedInward.job_entry_tests.length > 0 && (
                  <div className="pt-3 border-t border-blue-200/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FlaskConical className="w-4 h-4 text-indigo-600" />
                        <span>Allocate to Specific Test Method (Unit Economics)</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        {selectedInward.job_entry_tests.some((t: any) => (t.test_master?.category || "Construction") === "Construction") && (
                          <span className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                            {selectedInward.job_entry_tests.filter((t: any) => (t.test_master?.category || "Construction") === "Construction").length} Construction
                          </span>
                        )}
                        {selectedInward.job_entry_tests.some((t: any) => t.test_master?.category === "Environmental") && (
                          <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                            {selectedInward.job_entry_tests.filter((t: any) => t.test_master?.category === "Environmental").length} Environmental
                          </span>
                        )}
                      </div>
                    </div>

                    <select
                      value={form.job_entry_test_id}
                      onChange={(e) => {
                        const testId = e.target.value;
                        setField("job_entry_test_id", testId);
                        const t = findMatchingTest(selectedInward, testId);
                        if (t) {
                          const cat = t.test_master?.category || "Construction";
                          const testName =
                            t.test_master?.specific_test ||
                            t.test_master?.component_parameter ||
                            t.material_description ||
                            "Test";
                          setForm((prev) => ({
                            ...prev,
                            job_entry_test_id: t.id,
                            department: `${cat} Department`,
                            description: `Direct test expense for: [${cat}] ${testName} (Inward UID: ${selectedInward.uid_label || selectedInward.uid})`,
                          }));
                        } else {
                          setForm((prev) => ({
                            ...prev,
                            job_entry_test_id: "",
                            description: `Direct expense for Inward UID: ${selectedInward.uid_label || selectedInward.uid}`,
                          }));
                        }
                      }}
                      className="w-full h-10 px-3 bg-white border border-blue-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    >
                      <option value="">— Entire Inward Job (Shared / General Inward Cost) —</option>

                      {/* Construction Tests OptGroup */}
                      {selectedInward.job_entry_tests.some((t: any) => (t.test_master?.category || "Construction") === "Construction") && (
                        <optgroup label="🏗️ Construction Tests">
                          {selectedInward.job_entry_tests
                            .filter((t: any) => (t.test_master?.category || "Construction") === "Construction")
                            .map((t: any) => {
                              const tm = t.test_master;
                              const testName =
                                tm?.specific_test ||
                                tm?.component_parameter ||
                                t.material_description ||
                                "Test Parameter";
                              const mat = tm?.material_product || tm?.discipline_group || "Material";
                              return (
                                <option key={t.id} value={t.id}>
                                  [Construction] {testName} — [{mat}] {t.sample_quantity ? `(Qty: ${t.sample_quantity})` : ""}
                                </option>
                              );
                            })}
                        </optgroup>
                      )}

                      {/* Environmental Tests OptGroup */}
                      {selectedInward.job_entry_tests.some((t: any) => t.test_master?.category === "Environmental") && (
                        <optgroup label="🌱 Environmental Tests">
                          {selectedInward.job_entry_tests
                            .filter((t: any) => t.test_master?.category === "Environmental")
                            .map((t: any) => {
                              const tm = t.test_master;
                              const testName =
                                tm?.specific_test ||
                                tm?.component_parameter ||
                                t.material_description ||
                                "Test Parameter";
                              const mat = tm?.material_product || tm?.discipline_group || "Material";
                              return (
                                <option key={t.id} value={t.id}>
                                  [Environmental] {testName} — [{mat}] {t.sample_quantity ? `(Qty: ${t.sample_quantity})` : ""}
                                </option>
                              );
                            })}
                        </optgroup>
                      )}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Scope 2: TEST EXPENSE TAB (User selects Category & Test Name) */}
            {selectedScope === "test_expense" && (
              <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-4">
                {/* 1. Category Selector */}
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-2 uppercase tracking-wider">
                    1. Select Test Category <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3 max-w-md">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory("Construction");
                        setField("department", "Construction Department");
                      }}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        selectedCategory === "Construction"
                          ? "bg-white text-blue-700 border-blue-400 ring-2 ring-blue-500/20 shadow-xs"
                          : "bg-white/60 text-slate-600 border-slate-200 hover:bg-white"
                      }`}
                    >
                      <HardHat className="w-4 h-4 text-blue-600" />
                      <span>🏗️ Construction</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory("Environmental");
                        setField("department", "Environmental Department");
                      }}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        selectedCategory === "Environmental"
                          ? "bg-white text-teal-700 border-teal-400 ring-2 ring-teal-500/20 shadow-xs"
                          : "bg-white/60 text-slate-600 border-slate-200 hover:bg-white"
                      }`}
                    >
                      <Leaf className="w-4 h-4 text-teal-600" />
                      <span>🌱 Environmental</span>
                    </button>
                  </div>
                </div>

                {/* 2. Select Test Name */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FlaskConical className="w-4 h-4 text-indigo-600" />
                      <span>2. Select Test Name ({selectedCategory})</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full border border-indigo-200">
                      {categoryTestsList.length} Tests Available
                    </span>
                  </div>

                  <select
                    required
                    value={form.job_entry_test_id}
                    onChange={(e) => {
                      const testId = e.target.value;
                      setField("job_entry_test_id", testId);
                      const found = categoryTestsList.find((t) => t.id === testId);
                      if (found) {
                        setField("department", `${selectedCategory} Department`);
                        setField(
                          "description",
                          `Direct test expense for: [${selectedCategory}] ${found.name}`
                        );
                      }
                    }}
                    className="w-full h-11 px-3 bg-white border border-indigo-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                  >
                    <option value="">— Select a Test Name ({selectedCategory}) —</option>
                    {categoryTestsList.map((t) => (
                      <option key={t.id} value={t.id}>
                        [{selectedCategory}] {t.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Scope 3: IN-HOUSE LAB OPERATIONS */}
            {selectedScope === "inhouse" && (
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-emerald-950">In-House Laboratory Operations Expense</div>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      This expense will be allocated to internal laboratory operational capacity (calibration, chemicals, power, machine maintenance).
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200/70">
                  <label className="text-xs font-bold text-emerald-950 block mb-1.5">
                    Select Target Testing Department <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setField("department", "Construction Department");
                        if (!form.description || form.description.includes("In-house operational expense")) {
                          setField("description", "In-house operational expense for Construction Laboratory");
                        }
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        form.department === "Construction Department" || !form.department
                          ? "bg-white text-orange-700 border-orange-300 shadow-xs ring-2 ring-orange-500/20"
                          : "bg-white/60 text-slate-600 border-slate-200 hover:bg-white"
                      }`}
                    >
                      <span>🏗️ Construction Department</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setField("department", "Environmental Department");
                        if (!form.description || form.description.includes("In-house operational expense")) {
                          setField("description", "In-house operational expense for Environmental Laboratory");
                        }
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        form.department === "Environmental Department"
                          ? "bg-white text-teal-700 border-teal-300 shadow-xs ring-2 ring-teal-500/20"
                          : "bg-white/60 text-slate-600 border-slate-200 hover:bg-white"
                      }`}
                    >
                      <span>🌱 Environmental Department</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Scope 4: COMPANY OVERHEAD */}
            {selectedScope === "company" && (
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 text-xs text-purple-900 space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-600" />
                  <strong className="font-bold">General Company Overhead Allocation</strong>
                </div>
                <p className="text-[11px] text-purple-700 leading-relaxed">
                  This cost will be classified as company-level overhead and recorded in the Profit & Loss general administration ledger (salaries, office rent, electricity, pantry, audit).
                </p>
              </div>
            )}
          </div>

          {/* Card 2: Financial & Payment Details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <IndianRupee className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Step 2: Payment & Financial Details
                </h2>
                <p className="text-xs text-slate-500">
                  Enter the base cost, date, disbursement source, and ledger category.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Amount */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Expense Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    ₹
                  </span>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setField("amount", e.target.value)}
                    className="pl-8 h-11 rounded-xl font-black text-slate-900 text-base border-slate-300 focus:border-indigo-600"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Base invoice or voucher amount before withholding
                </span>
              </div>

              {/* Date */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Expense Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    required
                    type="date"
                    value={form.expense_date}
                    onChange={(e) => setField("expense_date", e.target.value)}
                    className="pl-9 h-11 rounded-xl text-xs font-medium border-slate-300"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Date when the payment was disbursed or incurred
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Accounting Category
                </label>
                <select
                  value={form.category_id}
                  onChange={(e) => setField("category_id", e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-none"
                >
                  <option value="">— Select Category —</option>
                  {displayedCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.scope ? `(${c.scope})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Paid From Account */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Paid From Bank / Cash Account
                </label>
                <select
                  value={form.account_id}
                  onChange={(e) => setField("account_id", e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-none"
                >
                  <option value="">Direct Cash Drawer / Unallocated</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.account_type?.toUpperCase()}) — Balance: ₹
                      {Number(a.current_balance || 0).toLocaleString("en-IN")}
                    </option>
                  ))}
                </select>
                {selectedAccount && (
                  <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
                    Available Balance: ₹{Number(selectedAccount.current_balance || 0).toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Payment Mode */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Payment Mode
                </label>
                <select
                  value={form.payment_mode}
                  onChange={(e) => setField("payment_mode", e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-none"
                >
                  <option value="bank">Bank Transfer / NEFT / IMPS</option>
                  <option value="upi">UPI / QR Code</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="rtgs">RTGS</option>
                </select>
              </div>

              {/* Vendor / Payee */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Vendor / Beneficiary Name
                </label>
                <Input
                  placeholder="e.g. ChemTech Solutions, BlueDart Logistics"
                  value={form.vendor_name}
                  onChange={(e) => setField("vendor_name", e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Description / Remarks */}
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Description & Ledger Particulars
              </label>
              <textarea
                rows={3}
                placeholder="Provide details regarding this expenditure for financial audit and test gross margin tracking..."
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Live Voucher Preview & Action Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-5 sticky top-6">
          {/* Live Receipt & Approval Card */}
          <div className="bg-white rounded-2xl p-5 text-slate-900 shadow-xs border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-rose-500" />
                <span className="text-xs font-bold tracking-wider uppercase text-slate-700">
                  Voucher Summary
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                LIVE PREVIEW
              </span>
            </div>

            {/* Main Net Amount */}
            <div>
              <span className="text-xs font-semibold text-slate-500">Total Expenditure</span>
              <div className="text-3xl font-black tracking-tight text-slate-900 mt-0.5">
                ₹{numAmount > 0 ? numAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
              </div>
              {numTds > 0 && (
                <div className="text-[11px] text-amber-700 font-medium mt-1">
                  Net Disbursed: ₹{netPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })} (TDS: -₹{numTds})
                </div>
              )}
            </div>

            {/* Allocation Details */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Scope:</span>
                <span className="font-bold text-slate-800 uppercase text-[11px]">
                  {selectedScope === "inward_cost"
                    ? "Inward Direct Cost"
                    : selectedScope === "test_expense"
                    ? "Test Expense"
                    : selectedScope === "inhouse"
                    ? "In-House Lab"
                    : "Company Overhead"}
                </span>
              </div>

              {selectedScope === "inward_cost" && selectedInward && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Inward UID:</span>
                  <span className="font-bold text-blue-600">
                    {selectedInward.uid_label || selectedInward.uid}
                  </span>
                </div>
              )}

              {selectedTest && (
                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-500">Tagged Test:</span>
                  <div className="text-right max-w-[170px]">
                    <span
                      className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mr-1 ${
                        (selectedTest.test_master?.category || "Construction") === "Environmental"
                          ? "bg-teal-50 text-teal-700 border border-teal-200"
                          : "bg-orange-50 text-orange-700 border border-orange-200"
                      }`}
                    >
                      {selectedTest.test_master?.category || "Construction"}
                    </span>
                    <span className="font-bold text-indigo-700 truncate block">
                      {selectedTest.test_master?.specific_test ||
                        selectedTest.test_master?.component_parameter ||
                        selectedTest.material_description ||
                        "Test"}
                    </span>
                  </div>
                </div>
              )}

              {form.department && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Department:</span>
                  <span className="font-bold text-amber-700 text-[11px]">
                    {form.department}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Payment Account:</span>
                <span className="font-semibold text-slate-700 truncate max-w-[170px]">
                  {selectedAccount ? selectedAccount.name : "Direct Cash"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-semibold text-slate-700 uppercase text-[10px]">
                  {form.payment_mode}
                </span>
              </div>
            </div>

            {/* Approval Workflow Indicator */}
            {requiresApproval ? (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block text-amber-900">Approval Workflow Required</strong>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    {numAmount > APPROVAL_THRESHOLD
                      ? "Amount exceeds ₹1,00,000 threshold. Will be queued for management sign-off."
                      : "Unbilled reimbursement of ₹500 or more requires approval."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-semibold text-emerald-700">
                  Auto-Approved: Will be posted immediately to account ledgers.
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-md shadow-rose-600/20 gap-2 cursor-pointer transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Recording Expense...</span>
                  </>
                ) : (
                  <>
                    <Receipt className="w-4 h-4" />
                    <span>Record Expense Entry</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(returnUrl)}
                disabled={isSubmitting}
                className="w-full h-9 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-slate-200 rounded-xl"
              >
                Cancel & Return
              </Button>
            </div>
          </div>

          {/* Contextual Guidance Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Info className="w-4 h-4 text-indigo-600" />
              <span>How are expenses handled?</span>
            </div>
            <ul className="text-[11px] text-slate-600 space-y-2 list-disc pl-4 leading-relaxed">
              <li>
                <strong>Inward Direct Expenses</strong> are charged directly against the specific job card and test parameter to calculate realistic laboratory gross margins.
              </li>
              <li>
                <strong>In-House Lab Costs</strong> (NABL calibration, reagents, lab electricity) flow into shared lab operations and factor into overall test profitability.
              </li>
              <li>
                <strong>Company Overheads</strong> are recorded in the general ledger and branch P&L balance sheets.
              </li>
            </ul>
          </div>
        </div>
      </form>
    </div>
  );
}
