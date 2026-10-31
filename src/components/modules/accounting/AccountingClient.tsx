"use client";

import React, { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/modules/PageHeader";
import { Plus, Trash2, Check, X, Landmark, Scroll, FileText, Save, ArrowUp, ArrowDown, ArrowUpRight, Clock, Eye, Star, Copy, CreditCard, Receipt, Banknote, BookOpen, FlaskConical, FileSpreadsheet, History, AlertCircle, Edit3, Send, CheckCircle2, XCircle, RefreshCw, Search, Building, Building2, Briefcase, Calendar, DollarSign, Filter, ArrowUpDown, TrendingDown, Package, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddBankAccountModal } from "./banks/AddBankAccountModal";
import { BankCards } from "./banks/BankCards";
import { CreateProformaInvoiceModal } from "./invoices/CreateProformaInvoiceModal";
import { RecordPaymentModal } from "./invoices/RecordPaymentModal";
import { InvoiceViewModal } from "./invoices/InvoiceViewModal";
import { InwardRegisterTable } from "./invoices/InwardRegisterTable";
import { InvoicesListTable } from "./invoices/InvoicesListTable";
import { PaymentReceiptModal } from "./receipts/PaymentReceiptModal";
import { ReceiptsListTable } from "./receipts/ReceiptsListTable";
import { CreateInwardReceiptModal } from "./receipts/CreateInwardReceiptModal";
import { RecordExpenseModal } from "./expenses/RecordExpenseModal";
import { LedgersHub } from "./ledgers/LedgersHub";
import { ExpenseLedgerTable } from "./ledgers/ExpenseLedgerTable";
import { TemplateManager } from "./templates/TemplateManager";
import { QuotationViewModal } from "./quotations/QuotationViewModal";
import { QuotationApprovalPanel } from "./quotations/QuotationApprovalPanel";
import { QuotationVersionHistory } from "./quotations/QuotationVersionHistory";
import { CreateQuotationModal } from "./quotations/CreateQuotationModal";
import { BankReconHub } from "./recon/BankReconHub";
import { ReportsHub } from "./reports/ReportsHub";
import { TestBillingExpensesTab } from "./test-financials/TestBillingExpensesTab";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/use-pagination";
import {
  createInwardReceiptAction,
  cancelInwardReceiptAction,
  createExpenseAction,
  approveExpenseAction,
  createExpenseCategoryAction,
  createBankAccountAction,
  createQuotationWithItemsAction,
  reviseQuotationAction,
  convertQuotationToProformaAction,
  createInvoiceWithItemsAction,
  recordInvoicePaymentAction,
  createProjectAction,
  searchAccountingAction,
  getProfitAndLossAction,
  getReconciliationAction,
  getQuotationsAction,
  getInvoicesAction,
  saveBankReconciliationAction,
  getBankReconciliationsAction,
  getInvoiceWithDetailsAction,
  saveQuotationTemplateAction,
  getReceiptDetailsAction,
} from "@/actions/accounting.actions";

interface Props {
  initialData: any;
  initialLedgersData?: any;
  activeTab?: string;
  initialSubTab?: "invoices" | "receipts" | "expenses" | string;
}

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const inputCls = "w-full border rounded-lg px-3 py-2 text-sm";

export function AccountingClient({ initialData, initialLedgersData, activeTab, initialSubTab }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    { id: "dashboard", href: "/accounting", label: "Dashboard", subtitle: "Overview of balances, projects, and recent activity." },
    { id: "quotations", href: "/accounting/quotations", label: "Quotations", subtitle: "Create and manage quotations and line items." },
    { id: "templates", href: "/accounting/templates", label: "T&C Templates", subtitle: "Standardize, manage and authorize legal terms and condition templates." },
    { id: "billing", href: "/accounting/billing", label: "Billings & Collection", subtitle: "Manage client invoices, inward receipts, and expenses." },
    { id: "test-financials", href: "/accounting/test-financials", label: "Test Economics & Expenses", subtitle: "Itemized test unit economics from paid invoices, direct test expense allocation, and margins." },
    { id: "ledgers", href: "/accounting/ledgers", label: "Ledgers", subtitle: "Double-entry Income Ledger, Expense Ledger, and Inward Job Costing." },
    { id: "banks", href: "/accounting/banks", label: "Bank Accounts", subtitle: "Track bank accounts, cash accounts, and ledger balances." },
    { id: "recon", href: "/accounting/reconciliation", label: "Reconciliation", subtitle: "Reconcile bank statements against ledger balances." },
    { id: "reports", href: "/accounting/reports", label: "Reports", subtitle: "Generate Profit & Loss and financial statements." },
  ];

  // Resolve current tab from prop, pathname, or default to dashboard
  const isDirectSubTab = activeTab === "receipts" || activeTab === "expenses" || activeTab === "invoices";
  const pathTab = tabs.find((t) => t.href === pathname)?.id;
  const isPathSubTab =
    pathname === "/accounting/receipts" ||
    pathname === "/accounting/expenses" ||
    pathname === "/accounting/invoices" ||
    pathname === "/accounting/billings" ||
    pathname === "/accounting/billing";

  const currentTab = activeTab
    ? (isDirectSubTab ? "billing" : activeTab)
    : isPathSubTab
    ? "billing"
    : pathTab || "dashboard";

  const [billingSubTab, setBillingSubTab] = useState<"invoices" | "receipts" | "expenses">(() => {
    if (initialSubTab === "receipts" || initialSubTab === "expenses" || initialSubTab === "invoices") {
      return initialSubTab;
    }
    if (activeTab === "receipts" || activeTab === "expenses" || activeTab === "invoices") {
      return activeTab;
    }
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const sub = params.get("subtab");
      if (sub === "receipts" || sub === "expenses" || sub === "invoices") {
        return sub;
      }
      if (window.location.pathname.includes("/receipts")) return "receipts";
      if (window.location.pathname.includes("/expenses")) return "expenses";
      if (window.location.pathname.includes("/invoices")) return "invoices";
    }
    return "invoices";
  });

  const handleSubTabChange = (tab: "invoices" | "receipts" | "expenses") => {
    setBillingSubTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("subtab", tab);
      window.history.replaceState(null, "", url.toString());
    }
  };

  useEffect(() => {
    if (initialSubTab === "receipts" || initialSubTab === "expenses" || initialSubTab === "invoices") {
      setBillingSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState<any>(null);

  // Inward & Proforma modal state
  const [isProformaModalOpen, setIsProformaModalOpen] = useState(false);
  const [selectedInwardForProforma, setSelectedInwardForProforma] = useState<any>(null);
  const [proformaOptions, setProformaOptions] = useState<{
    isRemainingBalance?: boolean;
    defaultBalanceAmount?: number;
    previousInvoice?: any;
  }>({});

  // Payment modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<any>(null);

  // Invoice view / print modal state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<any>(null);

  // Official Money Receipt modal state
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceiptForView, setSelectedReceiptForView] = useState<any>(null);

  // Inward Receipt creation modal state
  const [isInwardReceiptModalOpen, setIsInwardReceiptModalOpen] = useState(false);

  // Quotation creation / revision page navigation
  const [isCreateQuotationModalOpen, setIsCreateQuotationModalOpen] = useState(false);
  const [revisingQuotation, setRevisingQuotation] = useState<any | null>(null);

  const handleOpenCreateQuotation = (qToRevise?: any) => {
    if (qToRevise?.id) {
      router.push(`/accounting/quotations/new?revise=${qToRevise.id}`);
    } else {
      router.push("/accounting/quotations/new");
    }
  };

  // Record Expense modal state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedInwardForExpense, setSelectedInwardForExpense] = useState<any>(null);
  const [selectedTestIdForExpense, setSelectedTestIdForExpense] = useState<string | undefined>(undefined);
  const [defaultExpenseTypeForExpense, setDefaultExpenseTypeForExpense] = useState<"inward" | "inhouse" | "company" | undefined>(undefined);

  const handleOpenRecordExpense = (
    inward?: any,
    options?: { testId?: string; defaultExpenseType?: "inward" | "inhouse" | "company" }
  ) => {
    const params = new URLSearchParams();
    if (inward?.id) params.set("inward_id", inward.id);
    if (options?.testId) params.set("test_id", options.testId);
    if (options?.defaultExpenseType) params.set("type", options.defaultExpenseType);
    if (typeof window !== "undefined") {
      params.set("return_url", window.location.pathname + window.location.search);
    }
    router.push(`/accounting/expenses/new?${params.toString()}`);
  };

  // Test Economics Excel export handler ref
  const exportTestEconomicsExcelRef = useRef<() => void>(() => {});
  const handleRegisterExportExcel = useCallback((fn: () => void) => {
    exportTestEconomicsExcelRef.current = fn;
  }, []);

  // Template Manager Create handler ref
  const openCreateTemplateRef = useRef<() => void>(() => {});
  const handleRegisterOpenCreateTemplate = useCallback((fn: () => void) => {
    openCreateTemplateRef.current = fn;
  }, []);

  const data = initialData || {};

  function refresh() { startTransition(() => router.refresh()); }
  function run(fn: () => Promise<any>, ok = "Saved") {
    setMsg("");
    startTransition(async () => {
      const res = await fn();
      setMsg(res?.success ? ok : res?.error || "Failed");
      if (res?.success) refresh();
    });
  }

  const handleOpenAddBankModal = () => {
    setEditingBankAccount(null);
    setIsBankModalOpen(true);
  };

  const handleOpenEditBankModal = (acc: any) => {
    setEditingBankAccount(acc);
    setIsBankModalOpen(true);
  };

  const handleOpenCreateProforma = (
    inward?: any,
    options?: { isRemainingBalance?: boolean; defaultBalanceAmount?: number; previousInvoice?: any }
  ) => {
    setSelectedInwardForProforma(inward || null);
    setProformaOptions(options || {});
    setIsProformaModalOpen(true);
  };

  const handleOpenRecordPayment = (invoice: any) => {
    setSelectedInvoiceForPayment(invoice);
    setIsPaymentModalOpen(true);
  };

  const handleOpenViewInvoice = async (invoice: any) => {
    try {
      const res: any = await getInvoiceWithDetailsAction(invoice.id);
      if (res?.success && res?.data) {
        setSelectedInvoiceForView(res.data);
      } else {
        setSelectedInvoiceForView(invoice);
      }
    } catch {
      setSelectedInvoiceForView(invoice);
    }
    setIsViewModalOpen(true);
  };

  const handleOpenViewReceipt = async (receiptOrPayment: any) => {
    if (!receiptOrPayment) return;
    const receiptId = receiptOrPayment.receipt_id || receiptOrPayment.id;
    if (receiptId) {
      try {
        const res: any = await getReceiptDetailsAction(receiptId);
        if (res?.success && res?.data) {
          setSelectedReceiptForView(res.data);
          setIsReceiptModalOpen(true);
          return;
        }
      } catch (err) {
        console.error("Failed to load full receipt details:", err);
      }
    }
    setSelectedReceiptForView(receiptOrPayment);
    setIsReceiptModalOpen(true);
  };

  const currentTabConfig = tabs.find((t) => t.id === currentTab);
  const pageTitle = currentTabConfig ? currentTabConfig.label : "Dashboard";
  const pageSubtitle = currentTabConfig?.subtitle || "Overview of balances and activity.";

  const invoicesList = data.invoices || [];
  const receiptsList = data.receipts || data.recentReceipts || [];
  const expensesList = data.expenses || [];

  const headerActions = currentTab === "billing" ? (
    <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-xl overflow-x-auto no-scrollbar">
      <button
        type="button"
        onClick={() => handleSubTabChange("invoices")}
        className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 flex-shrink-0 ${
          billingSubTab === "invoices"
            ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
            : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
        }`}
      >
        <FileText className="w-4 h-4" />
        <span>Invoices & Billing</span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            billingSubTab === "invoices"
              ? "bg-blue-100 text-blue-800"
              : "bg-slate-200 text-slate-700"
          }`}
        >
          {invoicesList.length}
        </span>
      </button>

      <button
        type="button"
        onClick={() => handleSubTabChange("receipts")}
        className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 flex-shrink-0 ${
          billingSubTab === "receipts"
            ? "bg-white text-emerald-800 shadow-xs border border-slate-200/80"
            : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
        }`}
      >
        <Receipt className="w-4 h-4" />
        <span>Collections & Receipts</span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            billingSubTab === "receipts"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-200 text-slate-700"
          }`}
        >
          {receiptsList.length}
        </span>
      </button>

      <button
        type="button"
        onClick={() => handleSubTabChange("expenses")}
        className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 flex-shrink-0 ${
          billingSubTab === "expenses"
            ? "bg-white text-purple-800 shadow-xs border border-slate-200/80"
            : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
        }`}
      >
        <Banknote className="w-4 h-4" />
        <span>Outflows & Expenses</span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            billingSubTab === "expenses"
              ? "bg-purple-100 text-purple-800"
              : "bg-slate-200 text-slate-700"
          }`}
        >
          {expensesList.length}
        </span>
      </button>
    </div>
  ) : currentTab === "banks" ? (
    <Button
      variant="custom"
      size="none"
      onClick={handleOpenAddBankModal}
      className="h-[42px] px-5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-md shadow-orange-500/20 hover:shadow-orange-500/30 transition-all hover:scale-105 flex items-center gap-2 text-sm cursor-pointer"
    >
      <Plus className="w-4 h-4" />
      Add Bank Account
    </Button>
  ) : currentTab === "quotations" ? (
    <Button
      variant="custom"
      size="none"
      onClick={() => handleOpenCreateQuotation()}
      className="h-[42px] px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all hover:scale-105 flex items-center gap-2 text-sm cursor-pointer"
    >
      <Plus className="w-4 h-4" />
      New Quotation
    </Button>
  ) : currentTab === "templates" ? (
    <Button
      variant="custom"
      size="none"
      onClick={() => openCreateTemplateRef.current()}
      className="h-[42px] px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all hover:scale-105 flex items-center gap-2 text-sm cursor-pointer"
    >
      <Plus className="w-4 h-4" />
      New Template
    </Button>
  ) : currentTab === "dashboard" || currentTab === "invoices" ? (
    <Button
      variant="custom"
      size="none"
      onClick={() => handleOpenCreateProforma()}
      className="h-[42px] px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all hover:scale-105 flex items-center gap-2 text-sm cursor-pointer"
    >
      <Plus className="w-4 h-4" />
      Create Proforma Invoice
    </Button>
  ) : currentTab === "receipts" ? (
    <Button
      variant="custom"
      size="none"
      onClick={() => setIsInwardReceiptModalOpen(true)}
      className="h-[42px] px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-md shadow-slate-900/20 hover:shadow-slate-900/30 transition-all hover:scale-105 flex items-center gap-2 text-sm cursor-pointer"
    >
      <Plus className="w-4 h-4" />
      New Inward Receipt
    </Button>
  ) : currentTab === "ledgers" || currentTab === "expenses" ? (
    <Button
      variant="custom"
      size="none"
      onClick={() => handleOpenRecordExpense()}
      className="h-[42px] px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md shadow-rose-500/20 hover:shadow-rose-500/30 transition-all hover:scale-105 flex items-center gap-2 text-sm cursor-pointer"
    >
      <Plus className="w-4 h-4" />
      Record Expense
    </Button>
  ) : currentTab === "test-financials" ? (
    <div className="flex items-center gap-2.5">
      <Button
        variant="outline"
        size="none"
        onClick={() => exportTestEconomicsExcelRef.current()}
        className="h-[42px] px-4 bg-white hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-800 border border-slate-200/90 hover:border-emerald-300 rounded-xl font-bold shadow-xs transition-all hover:scale-[1.02] flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
      >
        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
        <span>Export Excel</span>
      </Button>
      <Button
        variant="custom"
        size="none"
        onClick={() => handleOpenRecordExpense(undefined, { defaultExpenseType: "inward" })}
        className="h-[42px] px-5 bg-gradient-to-r from-rose-600 via-rose-500 to-red-500 hover:from-rose-700 hover:to-red-600 text-white rounded-xl font-bold shadow-md shadow-rose-500/25 hover:shadow-rose-500/35 transition-all hover:scale-[1.02] flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>Record Test Expense</span>
      </Button>
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        icon={currentTab === "banks" ? Landmark : currentTab === "templates" ? Scroll : currentTab === "billing" ? CreditCard : currentTab === "ledgers" ? BookOpen : currentTab === "test-financials" ? FlaskConical : undefined}
        actions={headerActions}
      />
      {msg && <div className="p-3 rounded-lg bg-slate-100 text-sm">{msg}</div>}
      {currentTab === "dashboard" && (
        <Dashboard
          data={data}
          onOpenCreateProforma={handleOpenCreateProforma}
          onOpenViewInvoice={handleOpenViewInvoice}
          onOpenRecordPayment={handleOpenRecordPayment}
          onOpenViewReceipt={handleOpenViewReceipt}
          onOpenRecordExpense={handleOpenRecordExpense}
        />
      )}
      {currentTab === "billing" && (
        <BillingAndCollectionTab
          data={data}
          run={run}
          pending={pending}
          activeSubTab={billingSubTab}
          onSubTabChange={handleSubTabChange}
          onOpenCreateProforma={handleOpenCreateProforma}
          onOpenViewInvoice={handleOpenViewInvoice}
          onOpenRecordPayment={handleOpenRecordPayment}
          onOpenViewReceipt={handleOpenViewReceipt}
          onOpenCreateReceipt={() => setIsInwardReceiptModalOpen(true)}
          onOpenRecordExpense={handleOpenRecordExpense}
        />
      )}
      {currentTab === "ledgers" && (
        <LedgersHub
          initialLedgersData={initialLedgersData}
          dashboardData={data}
          onOpenRecordExpense={handleOpenRecordExpense}
          onOpenViewReceipt={handleOpenViewReceipt}
          onOpenCreateProforma={handleOpenCreateProforma}
          onRefresh={refresh}
        />
      )}
      {currentTab === "receipts" && (
        <ReceiptsTab
          data={data}
          run={run}
          pending={pending}
          onOpenViewReceipt={handleOpenViewReceipt}
          onOpenCreateReceipt={() => setIsInwardReceiptModalOpen(true)}
        />
      )}
      {currentTab === "expenses" && (
        <ExpensesTab
          data={data}
          run={run}
          pending={pending}
          onOpenRecordExpense={handleOpenRecordExpense}
        />
      )}
      {currentTab === "invoices" && (
        <InvoicesTab
          data={data}
          onOpenCreateProforma={handleOpenCreateProforma}
          onOpenViewInvoice={handleOpenViewInvoice}
          onOpenRecordPayment={handleOpenRecordPayment}
          onOpenViewReceipt={handleOpenViewReceipt}
          onOpenRecordExpense={handleOpenRecordExpense}
        />
      )}
      {currentTab === "quotations" && (
        <QuotationsTab
          data={data}
          run={run}
          pending={pending}
          onRefresh={refresh}
          onOpenViewInvoice={handleOpenViewInvoice}
          onOpenCreateQuotation={handleOpenCreateQuotation}
          onReviseQuotation={(q: any) => handleOpenCreateQuotation(q)}
          onOpenCreateProforma={handleOpenCreateProforma}
        />
      )}
      {currentTab === "templates" && (
        <TemplateManager
          initialTemplates={data.templates}
          onRegisterCreate={handleRegisterOpenCreateTemplate}
        />
      )}
      {currentTab === "banks" && (
        <BankCards
          accounts={data.accounts || []}
          onAddNew={handleOpenAddBankModal}
          onEdit={handleOpenEditBankModal}
          onRefresh={refresh}
        />
      )}
      {currentTab === "test-financials" && (
        <TestBillingExpensesTab
          data={data}
          onOpenCreateProforma={handleOpenCreateProforma}
          onOpenRecordExpense={handleOpenRecordExpense}
          onOpenViewInvoice={handleOpenViewInvoice}
          onRefresh={refresh}
          onRegisterExportExcel={handleRegisterExportExcel}
        />
      )}
      {currentTab === "recon" && <BankReconHub accounts={data.accounts || []} onRefresh={refresh} />}
      {currentTab === "reports" && <ReportsHub />}

      {/* Add Bank Account Modal */}
      <AddBankAccountModal
        isOpen={isBankModalOpen}
        onClose={() => {
          setIsBankModalOpen(false);
          setEditingBankAccount(null);
        }}
        account={editingBankAccount}
        onSuccess={refresh}
      />

      {/* Create Proforma Invoice Modal */}
      <CreateProformaInvoiceModal
        isOpen={isProformaModalOpen}
        onClose={() => {
          setIsProformaModalOpen(false);
          setSelectedInwardForProforma(null);
          setProformaOptions({});
        }}
        inward={selectedInwardForProforma}
        inwards={data.recentInwards || []}
        isRemainingBalance={proformaOptions.isRemainingBalance}
        defaultBalanceAmount={proformaOptions.defaultBalanceAmount}
        initialPreviousInvoice={proformaOptions.previousInvoice}
        clients={data.clients || []}
        projects={data.projects || []}
        onSuccess={refresh}
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedInvoiceForPayment(null);
        }}
        invoice={selectedInvoiceForPayment}
        accounts={data.accounts || []}
        onSuccess={refresh}
        onViewReceipt={handleOpenViewReceipt}
      />

      {/* View & Print Invoice Modal */}
      <InvoiceViewModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedInvoiceForView(null);
        }}
        invoice={selectedInvoiceForView}
        onRecordPayment={handleOpenRecordPayment}
        onRefresh={refresh}
        onViewReceipt={handleOpenViewReceipt}
        onCreateRemainingInvoice={handleOpenCreateProforma}
      />

      {/* Official Money Receipt Modal */}
      <PaymentReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setSelectedReceiptForView(null);
        }}
        receipt={selectedReceiptForView}
      />

      {/* Create Inward Receipt Modal */}
      <CreateInwardReceiptModal
        isOpen={isInwardReceiptModalOpen}
        onClose={() => setIsInwardReceiptModalOpen(false)}
        accounts={data.accounts || []}
        projects={data.projects || []}
        clients={data.clients || []}
        onSuccess={refresh}
      />

      {/* Record Expense Modal (Inward & Company) */}
      <RecordExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setSelectedInwardForExpense(null);
          setSelectedTestIdForExpense(undefined);
          setDefaultExpenseTypeForExpense(undefined);
        }}
        inward={selectedInwardForExpense}
        initialTestId={selectedTestIdForExpense}
        defaultExpenseType={defaultExpenseTypeForExpense}
        inwards={data.recentInwards || []}
        categories={data.categories || []}
        accounts={data.accounts || []}
        projects={data.projects || []}
        onSuccess={refresh}
      />

      {/* Create / Revise Quotation Modal */}
      <CreateQuotationModal
        isOpen={isCreateQuotationModalOpen}
        onClose={() => {
          setIsCreateQuotationModalOpen(false);
          setRevisingQuotation(null);
        }}
        revisingQuotation={revisingQuotation}
        data={data}
        onSuccess={(okMsg) => setMsg(okMsg || "Saved successfully")}
        onRefresh={refresh}
      />
    </div>
  );
}

function Dashboard({
  data,
  onOpenCreateProforma,
  onOpenViewInvoice,
  onOpenRecordPayment,
  onOpenViewReceipt,
  onOpenRecordExpense,
}: {
  data: any;
  onOpenCreateProforma: (inward?: any, options?: any) => void;
  onOpenViewInvoice: (invoice: any) => void;
  onOpenRecordPayment: (invoice: any) => void;
  onOpenViewReceipt?: (receipt: any) => void;
  onOpenRecordExpense?: (inward?: any) => void;
}) {
  const cashBank = (data.accounts || []).reduce((s: number, a: any) => s + Number(a.current_balance || 0), 0);
  const totalOutstanding = (data.invoices || []).reduce((s: number, i: any) => s + Number(i.balance_amount || 0), 0);
  const pendingInwards = (data.recentInwards || []).filter((inw: any) => !inw.invoices || inw.invoices.length === 0);

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Cash + Bank" value={fmt(cashBank)} />
        <Card label="Total Outstanding Due" value={fmt(totalOutstanding)} highlight />
        <Card label="Inwards Ready for Proforma" value={String(pendingInwards.length)} />
        <Card label="Active Projects" value={String((data.projects || []).length)} />
      </div>

      {/* INWARD REGISTER SECTION */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Client Inward Register</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700">
                Create Proforma Invoice
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              New client inwards created in the system. Click &quot;Create Proforma&quot; to auto-populate test items and generate a proforma invoice, or record direct inward expenses.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => onOpenCreateProforma()}
            className="h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Proforma</span>
          </Button>
        </div>

        <InwardRegisterTable
          inwards={data.recentInwards || []}
          onCreateProforma={onOpenCreateProforma}
          onViewInvoice={onOpenViewInvoice}
          onRecordExpense={onOpenRecordExpense}
        />
      </div>

      {/* INVOICES & PAYMENT TRACKING SECTION */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Invoices & Outstanding Balances</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                Payment Tracking
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Track amount received, partial payments, and remaining balance against each invoice and customer.
            </p>
          </div>
        </div>

        <InvoicesListTable
          invoices={data.invoices || []}
          onViewInvoice={onOpenViewInvoice}
          onRecordPayment={onOpenRecordPayment}
          onViewReceipt={onOpenViewReceipt}
          onCreateRemainingInvoice={onOpenCreateProforma}
        />
      </div>
    </div>
  );
}

function ReceiptsTab({ data, run, onOpenViewReceipt, onOpenCreateReceipt }: any) {
  const receiptsList = data.receipts || data.recentReceipts || [];

  return (
    <div className="space-y-6">
      <ReceiptsListTable
        receipts={receiptsList}
        onViewReceipt={onOpenViewReceipt}
        onCancelReceipt={(receiptId: string, reason: string) => {
          run(() => cancelInwardReceiptAction(receiptId, reason), "Receipt Cancelled");
        }}
        onOpenCreateReceipt={onOpenCreateReceipt}
      />
    </div>
  );
}

function ExpensesTab({ data, run, pending, onOpenRecordExpense }: any) {
  const [catName, setCatName] = useState("");
  const [showAddCat, setShowAddCat] = useState(false);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Expense Management & Outflow Ledgers</h3>
          <p className="text-xs text-slate-500">
            Record direct inward job expenses (testing consumables, courier, external lab tests) & general company operational overheads.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddCat(!showAddCat)}
            className="h-9 px-3 text-xs font-semibold rounded-xl cursor-pointer"
          >
            {showAddCat ? "Close Form" : "+ New Category"}
          </Button>
          <Button
            size="sm"
            onClick={() => onOpenRecordExpense?.()}
            className="h-9 px-4 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1.5 rounded-xl cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Expense</span>
          </Button>
        </div>
      </div>

      {showAddCat && (
        <form
          className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (catName.trim()) {
              run(() => createExpenseCategoryAction(catName.trim()), "Category added");
              setCatName("");
              setShowAddCat(false);
            }
          }}
        >
          <input
            className="flex-1 min-w-[220px] border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="New category name (e.g. Courier Logistics, Lab Consumables, Office Rent)"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
          />
          <button
            type="submit"
            disabled={!catName.trim() || pending}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-xs cursor-pointer disabled:opacity-50"
          >
            Save Category
          </button>
        </form>
      )}

      {/* Full Expense Ledger Table */}
      <ExpenseLedgerTable
        expenses={data.expenses || []}
        onRecordExpense={onOpenRecordExpense}
        onRefresh={() => run(async () => {}, "Refreshed")}
        hideSummaryCards={true}
      />
    </div>
  );
}

function InvoicesTab({
  data,
  activeViewTab,
  onViewTabChange,
  onOpenCreateProforma,
  onOpenViewInvoice,
  onOpenRecordPayment,
  onOpenViewReceipt,
  onOpenRecordExpense,
}: {
  data: any;
  activeViewTab?: "invoices" | "uninvoiced" | "inwards";
  onViewTabChange?: (tab: "invoices" | "uninvoiced" | "inwards") => void;
  onOpenCreateProforma: (inward?: any, options?: any) => void;
  onOpenViewInvoice: (invoice: any) => void;
  onOpenRecordPayment: (invoice: any) => void;
  onOpenViewReceipt?: (receipt: any) => void;
  onOpenRecordExpense?: (inward?: any) => void;
}) {
  const [internalSubTab, setInternalSubTab] = useState<"invoices" | "uninvoiced" | "inwards">("invoices");
  const subTab = activeViewTab !== undefined ? activeViewTab : internalSubTab;
  const setSubTab = (t: "invoices" | "uninvoiced" | "inwards") => {
    if (onViewTabChange) onViewTabChange(t);
    setInternalSubTab(t);
  };

  const invoicesCount = (data.invoices || []).length;
  const inwardsCount = (data.recentInwards || []).length;
  const unbilledInwards = (data.recentInwards || []).filter((j: any) => !j.invoices || j.invoices.length === 0).length;

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-xl overflow-x-auto no-scrollbar">
          {/* Tab 1: All Invoices */}
          <button
            type="button"
            onClick={() => setSubTab("invoices")}
            className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              subTab === "invoices"
                ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>All Invoices</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                subTab === "invoices" ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-700"
              }`}
            >
              {invoicesCount}
            </span>
          </button>

          {/* Tab 2: Uninvoiced Inwards (Awaiting Invoices) */}
          <button
            type="button"
            onClick={() => setSubTab("uninvoiced")}
            className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              subTab === "uninvoiced"
                ? "bg-white text-amber-800 shadow-xs border border-amber-300 ring-1 ring-amber-300/40"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${unbilledInwards > 0 ? "text-amber-600" : "text-slate-400"}`} />
            <span>Uninvoiced Inwards</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 ${
                subTab === "uninvoiced"
                  ? "bg-amber-100 text-amber-900 font-mono"
                  : unbilledInwards > 0
                  ? "bg-amber-100/90 text-amber-800 font-mono"
                  : "bg-slate-200 text-slate-700 font-mono"
              }`}
            >
              {unbilledInwards > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              )}
              <span>{unbilledInwards}</span>
            </span>
          </button>

          {/* Tab 3: All Inward Register */}
          <button
            type="button"
            onClick={() => setSubTab("inwards")}
            className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              subTab === "inwards"
                ? "bg-white text-indigo-700 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Inward Register (All)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                subTab === "inwards" ? "bg-indigo-100 text-indigo-800" : "bg-slate-200 text-slate-700"
              }`}
            >
              {inwardsCount}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => onOpenCreateProforma()}
            className="h-10 px-4.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-xl cursor-pointer shadow-md shadow-blue-500/20 hover:scale-[1.02] transition-all flex items-center"
          >
            <Plus className="w-4 h-4" />
            <span>Create Proforma Invoice</span>
          </Button>
        </div>
      </div>

      {/* Subtab View */}
      {subTab === "invoices" && (
        <InvoicesListTable
          invoices={data.invoices || []}
          onViewInvoice={onOpenViewInvoice}
          onRecordPayment={onOpenRecordPayment}
          onViewReceipt={onOpenViewReceipt}
          onCreateRemainingInvoice={onOpenCreateProforma}
        />
      )}

      {subTab === "uninvoiced" && (
        <InwardRegisterTable
          key="uninvoiced"
          inwards={data.recentInwards || []}
          onCreateProforma={onOpenCreateProforma}
          onViewInvoice={onOpenViewInvoice}
          onRecordExpense={onOpenRecordExpense}
          initialStatusFilter="pending"
        />
      )}

      {subTab === "inwards" && (
        <InwardRegisterTable
          key="all-inwards"
          inwards={data.recentInwards || []}
          onCreateProforma={onOpenCreateProforma}
          onViewInvoice={onOpenViewInvoice}
          onRecordExpense={onOpenRecordExpense}
          initialStatusFilter="all"
        />
      )}
    </div>
  );
}

function BillingAndCollectionTab({
  data,
  run,
  pending,
  activeSubTab,
  onSubTabChange,
  onOpenCreateProforma,
  onOpenViewInvoice,
  onOpenRecordPayment,
  onOpenViewReceipt,
  onOpenCreateReceipt,
  onOpenRecordExpense,
}: {
  data: any;
  run: any;
  pending: boolean;
  activeSubTab: "invoices" | "receipts" | "expenses";
  onSubTabChange: (tab: "invoices" | "receipts" | "expenses") => void;
  onOpenCreateProforma: (inward?: any, options?: any) => void;
  onOpenViewInvoice: (invoice: any) => void;
  onOpenRecordPayment: (invoice: any) => void;
  onOpenViewReceipt: (receipt: any) => void;
  onOpenCreateReceipt: () => void;
  onOpenRecordExpense?: (inward?: any) => void;
}) {
  const [invoicesViewTab, setInvoicesViewTab] = useState<"invoices" | "uninvoiced" | "inwards">("invoices");

  const invoices = data.invoices || [];
  const receipts = data.receipts || data.recentReceipts || [];
  const expenses = data.expenses || [];
  const inwards = data.recentInwards || [];

  // ================= Invoices & General Billing Metrics =================
  const totalBilled = invoices.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
  const activeReceipts = receipts.filter((r: any) => r.status !== "cancelled");
  const totalCollections = activeReceipts.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  const totalOutstanding = invoices.reduce((s: number, i: any) => s + Number(i.balance_amount || 0), 0);
  const collectionRate = totalBilled > 0 ? Math.min(100, Math.round((totalCollections / totalBilled) * 100)) : 0;
  const unpaidCount = invoices.filter((i: any) => Number(i.balance_amount || 0) > 0).length;
  const proformaCount = invoices.filter((i: any) => i.invoice_type === "proforma").length;
  const taxCount = invoices.filter((i: any) => i.invoice_type !== "proforma").length;
  const verifiedReceiptsCount = activeReceipts.length;
  const unbilledInwards = inwards.filter((j: any) => !j.invoices || j.invoices.length === 0).length;
  const invoicedInwardsCount = Math.max(0, inwards.length - unbilledInwards);
  const inwardBillingRate = inwards.length > 0 ? Math.round((invoicedInwardsCount / inwards.length) * 100) : 100;

  // ================= Receipts Breakdown Metrics =================
  const bankReceipts = activeReceipts.filter((r: any) => {
    const m = String(r.payment_mode || "").toLowerCase();
    return m.includes("bank") || m.includes("neft") || m.includes("rtgs") || m.includes("transfer") || m.includes("online");
  });
  const bankAmount = bankReceipts.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  const bankPercent = totalCollections > 0 ? Math.round((bankAmount / totalCollections) * 100) : 0;

  const upiReceipts = activeReceipts.filter((r: any) => {
    const m = String(r.payment_mode || "").toLowerCase();
    return m.includes("upi") || m.includes("qr");
  });
  const upiAmount = upiReceipts.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  const upiPercent = totalCollections > 0 ? Math.round((upiAmount / totalCollections) * 100) : 0;

  const cashChequeReceipts = activeReceipts.filter((r: any) => {
    const m = String(r.payment_mode || "").toLowerCase();
    return !bankReceipts.includes(r) && !upiReceipts.includes(r);
  });
  const cashAmount = cashChequeReceipts
    .filter((r: any) => String(r.payment_mode || "").toLowerCase().includes("cash"))
    .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  const chequeAmount = cashChequeReceipts
    .filter((r: any) => !String(r.payment_mode || "").toLowerCase().includes("cash"))
    .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  const cashChequeTotal = cashAmount + chequeAmount;
  const cashChequePercent = totalCollections > 0 ? Math.round((cashChequeTotal / totalCollections) * 100) : 0;

  // ================= Expenses Breakdown Metrics =================
  const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const inwardExpensesList = expenses.filter((e: any) => e.expense_type === "inward" || e.job_entry_id);
  const inwardExpensesAmount = inwardExpensesList.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const inwardExpensesPercent = totalExpenses > 0 ? Math.round((inwardExpensesAmount / totalExpenses) * 100) : 0;

  const inhouseExpensesAmount = expenses
    .filter((e: any) => e.expense_type === "inhouse" && !e.job_entry_id)
    .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const companyExpensesAmount = expenses
    .filter((e: any) => (e.expense_type === "company" || !e.expense_type) && !e.job_entry_id)
    .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const overheadExpensesAmount = inhouseExpensesAmount + companyExpensesAmount;
  const overheadExpensesList = expenses.filter((e: any) => e.expense_type !== "inward" && !e.job_entry_id);
  const overheadExpensesPercent = totalExpenses > 0 ? Math.round((overheadExpensesAmount / totalExpenses) * 100) : 0;

  const netCashFlow = totalCollections - totalExpenses;
  const netMarginPercent = totalCollections > 0 ? Math.round((netCashFlow / totalCollections) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ================= Invoices & Billing Dynamic KPI Hero ================= */}
      {activeSubTab === "invoices" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
          {/* Card 1: Total Invoiced / Billed */}
          <div className="h-[108px] p-2.5 sm:p-3 bg-gradient-to-b from-blue-50/30 via-white to-white border border-slate-200/80 hover:border-blue-300 rounded-xl shadow-2xs hover:shadow-xs transition-all duration-200 group flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  Total Invoiced (Billed)
                </span>
                <div className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-lg bg-blue-50 border border-blue-100/80 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                  <FileText className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-0.5 font-sans truncate">
                {fmt(totalBilled)}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 gap-1 mt-auto">
              <span className="truncate">{invoices.length} invoices issued</span>
              <span className="font-semibold text-blue-700 bg-blue-50/80 border border-blue-100/80 px-2 py-0.5 rounded-full text-[10px] shrink-0 whitespace-nowrap">
                {proformaCount} PI · {taxCount} Tax
              </span>
            </div>
          </div>

          {/* Card 2: Realized Collections */}
          <div className="h-[108px] p-2.5 sm:p-3 bg-gradient-to-b from-emerald-50/30 via-white to-white border border-slate-200/80 hover:border-emerald-300 rounded-xl shadow-2xs hover:shadow-xs transition-all duration-200 group flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="truncate">Realized Collections</span>
                </span>
                <div className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-lg bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-105 transition-transform">
                  <Receipt className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-0.5 font-sans truncate">
                {fmt(totalCollections)}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 gap-1 mt-auto">
              <span className="truncate">{verifiedReceiptsCount} vouchers</span>
              <div className="flex items-center gap-1.5 bg-emerald-50/90 border border-emerald-200/60 px-2 py-0.5 rounded-full text-[10px] font-semibold text-emerald-800 shrink-0 whitespace-nowrap">
                <div className="w-8 sm:w-10 h-1.5 bg-emerald-200/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${collectionRate}%` }}
                  />
                </div>
                <span>{collectionRate}%</span>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-100/70">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${collectionRate}%` }}
              />
            </div>
          </div>

          {/* Card 3: Receivables Pending (Outstanding Due) */}
          <div className="h-[108px] p-2.5 sm:p-3 bg-gradient-to-b from-amber-50/30 via-white to-white border border-slate-200/80 hover:border-amber-300 rounded-xl shadow-2xs hover:shadow-xs transition-all duration-200 group flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5 truncate">
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">Outstanding Due</span>
                </span>
                <div className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-lg bg-amber-50 border border-amber-100/80 flex items-center justify-center text-amber-600 shrink-0 group-hover:scale-105 transition-transform">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-0.5 font-sans truncate">
                {fmt(totalOutstanding)}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 gap-1 mt-auto">
              <span className="truncate">{unpaidCount} unpaid/partial</span>
              <span className="text-[10px] font-semibold text-amber-800 bg-amber-50/80 border border-amber-200/60 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                Pending Clearance
              </span>
            </div>
          </div>

          {/* Card 4: Inward Register Pipeline */}
          <div
            onClick={() => {
              onSubTabChange("invoices");
              setInvoicesViewTab("uninvoiced");
            }}
            className="h-[108px] p-2.5 sm:p-3 bg-gradient-to-b from-indigo-50/30 via-white to-white border border-slate-200/80 hover:border-amber-400 hover:ring-2 hover:ring-amber-400/25 rounded-xl shadow-2xs hover:shadow-md transition-all duration-200 group flex flex-col justify-between relative overflow-hidden cursor-pointer"
            title="Click to view all inwards awaiting invoice creation"
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5 truncate">
                  <FlaskConical className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">Inward Jobs To Bill</span>
                </span>
                <div className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-lg bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-110 group-hover:bg-amber-100 group-hover:text-amber-800 transition-all">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-0.5 font-sans flex items-baseline gap-1.5 truncate">
                <span>{unbilledInwards}</span>
                <span className="text-xs font-semibold text-slate-500">Jobs To Bill</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 gap-1 mt-auto">
              <span className="truncate">{inwards.length} inward entries</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 transition-colors shrink-0 whitespace-nowrap ${
                unbilledInwards > 0
                  ? "bg-amber-50/80 text-amber-800 border-amber-200/60 group-hover:bg-amber-100 group-hover:text-amber-900 group-hover:border-amber-300"
                  : "bg-emerald-50/80 text-emerald-800 border-emerald-200/60"
              }`}>
                {unbilledInwards > 0 ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>{unbilledInwards} Awaiting · View →</span>
                  </>
                ) : (
                  "All Invoiced"
                )}
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-100/70">
              <div
                className="h-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${inwardBillingRate}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ================= Collections & Receipts Dynamic KPI Hero ================= */}
      {activeSubTab === "receipts" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
          {/* Card 1: Total Inward Collections */}
          <div className="h-[108px] p-2.5 sm:p-3 bg-gradient-to-b from-emerald-50/30 via-white to-white border border-slate-200/80 hover:border-emerald-300 rounded-xl shadow-2xs hover:shadow-xs transition-all duration-200 group flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="truncate">Total Inward Collections</span>
                </span>
                <div className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-lg bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-105 transition-transform">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-0.5 font-sans truncate">
                {fmt(totalCollections)}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 gap-1 mt-auto">
              <span className="truncate">{activeReceipts.length} verified vouchers</span>
              <span className="font-semibold text-emerald-800 bg-emerald-50/80 border border-emerald-200/60 px-2 py-0.5 rounded-full text-[10px] shrink-0 whitespace-nowrap">
                Realized
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-100/70">
              <div className="h-full bg-emerald-500 w-full" />
            </div>
          </div>

          {/* Card 2: Bank / NEFT / RTGS */}
          <div className="h-[108px] p-2.5 sm:p-3 bg-gradient-to-b from-blue-50/30 via-white to-white border border-slate-200/80 hover:border-blue-300 rounded-xl shadow-2xs hover:shadow-xs transition-all duration-200 group flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5 truncate">
                  <Landmark className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">Bank / NEFT / RTGS</span>
                </span>
                <div className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-lg bg-blue-50 border border-blue-100/80 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                  <Landmark className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-0.5 font-sans truncate">
                {fmt(bankAmount)}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 gap-1 mt-auto">
              <span className="truncate">{bankReceipts.length} bank vouchers</span>
              <div className="flex items-center gap-1.5 bg-blue-50/90 border border-blue-200/60 px-2 py-0.5 rounded-full text-[10px] font-semibold text-blue-800 shrink-0 whitespace-nowrap">
                <div className="w-8 sm:w-10 h-1.5 bg-blue-200/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${bankPercent}%` }}
                  />
                </div>
                <span>{bankPercent}%</span>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-100/70">
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${bankPercent}%` }}
              />
            </div>
          </div>

          {/* Card 3: UPI & QR Codes */}
          <div className="h-[108px] p-2.5 sm:p-3 bg-gradient-to-b from-purple-50/30 via-white to-white border border-slate-200/80 hover:border-purple-300 rounded-xl shadow-2xs hover:shadow-xs transition-all duration-200 group flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1.5 truncate">
                  <Smartphone className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="truncate">UPI & QR Codes</span>
                </span>
                <div className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-lg bg-purple-50 border border-purple-100/80 flex items-center justify-center text-purple-600 shrink-0 group-hover:scale-105 transition-transform">
                  <Smartphone className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-0.5 font-sans truncate">
                {fmt(upiAmount)}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 gap-1 mt-auto">
              <span className="truncate">{upiReceipts.length} UPI vouchers</span>
              <div className="flex items-center gap-1.5 bg-purple-50/90 border border-purple-200/60 px-2 py-0.5 rounded-full text-[10px] font-semibold text-purple-800 shrink-0 whitespace-nowrap">
                <div className="w-8 sm:w-10 h-1.5 bg-purple-200/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full transition-all duration-500"
                    style={{ width: `${upiPercent}%` }}
                  />
                </div>
                <span>{upiPercent}%</span>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-100/70">
              <div
                className="h-full bg-purple-500 transition-all duration-500"
                style={{ width: `${upiPercent}%` }}
              />
            </div>
          </div>

          {/* Card 4: Liquid Cash & Cheques */}
          <div className="h-[108px] p-2.5 sm:p-3 bg-gradient-to-b from-amber-50/30 via-white to-white border border-slate-200/80 hover:border-amber-300 rounded-xl shadow-2xs hover:shadow-xs transition-all duration-200 group flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5 truncate">
                  <Banknote className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">Cash & Cheques</span>
                </span>
                <div className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-lg bg-amber-50 border border-amber-100/80 flex items-center justify-center text-amber-600 shrink-0 group-hover:scale-105 transition-transform">
                  <Banknote className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-0.5 font-sans truncate">
                {fmt(cashChequeTotal)}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 gap-1 mt-auto">
              <span className="truncate">Cash: {fmt(cashAmount)}</span>
              <span className="text-[10px] font-semibold text-amber-800 bg-amber-50/80 border border-amber-200/60 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                Cheque: {fmt(chequeAmount)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ================= Outflows & Expenses Dynamic KPI Hero ================= */}
      {activeSubTab === "expenses" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
          {/* Card 1: Total Outflows (Expenses) */}
          <div className="h-[108px] p-2.5 sm:p-3 bg-gradient-to-b from-rose-50/30 via-white to-white border border-slate-200/80 hover:border-rose-300 rounded-xl shadow-2xs hover:shadow-xs transition-all duration-200 group flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5 truncate">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span className="truncate">Total Outflows (Expenses)</span>
                </span>
                <div className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-lg bg-rose-50 border border-rose-100/80 flex items-center justify-center text-rose-600 shrink-0 group-hover:scale-105 transition-transform">
                  <TrendingDown className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-0.5 font-sans truncate">
                {fmt(totalExpenses)}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 gap-1 mt-auto">
              <span className="truncate">{expenses.length} cleared debits</span>
              <span className="text-[10px] font-semibold text-rose-800 bg-rose-50/80 border border-rose-200/60 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                All Outflows
              </span>
            </div>
          </div>

          {/* Card 2: Inward Job Direct Costs */}
          <div className="h-[108px] p-2.5 sm:p-3 bg-gradient-to-b from-blue-50/30 via-white to-white border border-slate-200/80 hover:border-blue-300 rounded-xl shadow-2xs hover:shadow-xs transition-all duration-200 group flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5 truncate">
                  <Package className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">Inward Direct Costs</span>
                </span>
                <div className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-lg bg-blue-50 border border-blue-100/80 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                  <Package className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-0.5 font-sans truncate">
                {fmt(inwardExpensesAmount)}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 gap-1 mt-auto">
              <span className="truncate">{inwardExpensesList.length} job-tagged</span>
              <div className="flex items-center gap-1.5 bg-blue-50/90 border border-blue-200/60 px-2 py-0.5 rounded-full text-[10px] font-semibold text-blue-800 shrink-0 whitespace-nowrap">
                <div className="w-8 sm:w-10 h-1.5 bg-blue-200/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${inwardExpensesPercent}%` }}
                  />
                </div>
                <span>{inwardExpensesPercent}%</span>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-100/70">
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${inwardExpensesPercent}%` }}
              />
            </div>
          </div>

          {/* Card 3: Lab & Admin Overheads */}
          <div className="h-[108px] p-2.5 sm:p-3 bg-gradient-to-b from-purple-50/30 via-white to-white border border-slate-200/80 hover:border-purple-300 rounded-xl shadow-2xs hover:shadow-xs transition-all duration-200 group flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1.5 truncate">
                  <Building2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="truncate">Lab & Admin Overheads</span>
                </span>
                <div className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-lg bg-purple-50 border border-purple-100/80 flex items-center justify-center text-purple-600 shrink-0 group-hover:scale-105 transition-transform">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-0.5 font-sans truncate">
                {fmt(overheadExpensesAmount)}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 gap-1 mt-auto">
              <span className="truncate">{overheadExpensesList.length} operational debits</span>
              <div className="flex items-center gap-1.5 bg-purple-50/90 border border-purple-200/60 px-2 py-0.5 rounded-full text-[10px] font-semibold text-purple-800 shrink-0 whitespace-nowrap">
                <div className="w-8 sm:w-10 h-1.5 bg-purple-200/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full transition-all duration-500"
                    style={{ width: `${overheadExpensesPercent}%` }}
                  />
                </div>
                <span>{overheadExpensesPercent}%</span>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-100/70">
              <div
                className="h-full bg-purple-500 transition-all duration-500"
                style={{ width: `${overheadExpensesPercent}%` }}
              />
            </div>
          </div>

          {/* Card 4: Outflows & Net Spread */}
          <div className="h-[108px] p-2.5 sm:p-3 bg-gradient-to-b from-emerald-50/30 via-white to-white border border-slate-200/80 hover:border-emerald-300 rounded-xl shadow-2xs hover:shadow-xs transition-all duration-200 group flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 truncate">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Net Operating Margin</span>
                </span>
                <div className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-lg bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-105 transition-transform">
                  <Banknote className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className={`text-lg sm:text-xl font-bold tracking-tight mt-0.5 font-sans truncate ${netCashFlow >= 0 ? "text-slate-900" : "text-rose-900"}`}>
                {netCashFlow >= 0 ? "+" : ""}{fmt(netCashFlow)}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 gap-1 mt-auto">
              <span className="truncate">{fmt(totalCollections)} in · {fmt(totalExpenses)} out</span>
              <span className={`font-semibold px-2 py-0.5 rounded-full text-[10px] border shrink-0 whitespace-nowrap ${
                netCashFlow >= 0
                  ? "bg-emerald-50/80 text-emerald-800 border-emerald-200/60"
                  : "bg-rose-50/80 text-rose-800 border-rose-200/60"
              }`}>
                {netMarginPercent}% Margin
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ================= Sub-Tab Content ================= */}
      {activeSubTab === "invoices" && (
        <InvoicesTab
          data={data}
          activeViewTab={invoicesViewTab}
          onViewTabChange={setInvoicesViewTab}
          onOpenCreateProforma={onOpenCreateProforma}
          onOpenViewInvoice={onOpenViewInvoice}
          onOpenRecordPayment={onOpenRecordPayment}
          onOpenViewReceipt={onOpenViewReceipt}
          onOpenRecordExpense={onOpenRecordExpense}
        />
      )}

      {activeSubTab === "receipts" && (
        <ReceiptsTab
          data={data}
          run={run}
          onOpenViewReceipt={onOpenViewReceipt}
          onOpenCreateReceipt={onOpenCreateReceipt}
        />
      )}

      {activeSubTab === "expenses" && (
        <ExpensesTab
          data={data}
          run={run}
          pending={pending}
          onOpenRecordExpense={onOpenRecordExpense}
        />
      )}
    </div>
  );
}

function QuotationsTab({
  data,
  run,
  pending,
  onRefresh,
  onOpenViewInvoice,
  onOpenCreateQuotation,
  onReviseQuotation,
  onOpenCreateProforma,
}: any) {
  const router = useRouter();
  const [selectedQuotationForView, setSelectedQuotationForView] = useState<any | null>(null);
  const [selectedQuotationForHistory, setSelectedQuotationForHistory] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const rawQuotations: any[] = data?.quotations || [];

  // Compute summary stats
  const totalCount = rawQuotations.length;
  const totalValue = rawQuotations.reduce((sum, q) => sum + (Number(q.total_amount || q.amount) || 0), 0);
  const draftCount = rawQuotations.filter((q) => (q.status || "draft").toLowerCase() === "draft").length;
  const sentCount = rawQuotations.filter((q) => (q.status || "").toLowerCase() === "sent").length;
  const approvedCount = rawQuotations.filter(
    (q) => (q.status || "").toLowerCase() === "approved" || (q.status || "").toLowerCase() === "accepted"
  ).length;
  const approvedValue = rawQuotations
    .filter((q) => (q.status || "").toLowerCase() === "approved" || (q.status || "").toLowerCase() === "accepted")
    .reduce((sum, q) => sum + (Number(q.total_amount || q.amount) || 0), 0);
  const reworkCount = rawQuotations.filter(
    (q) => (q.status || "").toLowerCase() === "rework" || (q.status || "").toLowerCase() === "revision_requested"
  ).length;
  const rejectedCount = rawQuotations.filter((q) => (q.status || "").toLowerCase() === "rejected").length;

  // Filter quotations
  const filteredQuotations = rawQuotations.filter((q) => {
    const status = (q.status || "draft").toLowerCase();
    if (statusFilter !== "all") {
      if (statusFilter === "approved" && !(status === "approved" || status === "accepted")) return false;
      if (statusFilter === "rework" && !(status === "rework" || status === "revision_requested")) return false;
      if (statusFilter !== "approved" && statusFilter !== "rework" && status !== statusFilter) return false;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchNo = (q.quotation_no || "").toLowerCase().includes(query);
      const matchClient = (q.clients?.name || q.client?.name || "").toLowerCase().includes(query);
      const matchProject = (q.projects?.name || q.project?.name || "").toLowerCase().includes(query);
      const matchItems = Array.isArray(q.items) && q.items.some((it: any) => (it.description || "").toLowerCase().includes(query));
      return matchNo || matchClient || matchProject || matchItems;
    }

    return true;
  });

  const pagination = usePagination({
    data: filteredQuotations,
    initialPageSize: 10,
  });

  const getStatusBadge = (statusStr: string) => {
    const status = (statusStr || "draft").toLowerCase();
    switch (status) {
      case "approved":
      case "accepted":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Approved
          </span>
        );
      case "sent":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1.5 shadow-2xs">
            <Send className="w-3.5 h-3.5 text-blue-600" /> Sent to Client
          </span>
        );
      case "rework":
      case "revision_requested":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5 shadow-2xs">
            <RefreshCw className="w-3.5 h-3.5 text-amber-600" /> Rework Needed
          </span>
        );
      case "rejected":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1.5 shadow-2xs">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-slate-500" /> Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Summary Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3 sm:p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs hover:shadow-xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Quotations</span>
            <FileText className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 tracking-tight">{totalCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{fmt(totalValue)} total value</div>
        </div>

        <div className="p-3 sm:p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs hover:shadow-xs transition-all hover:border-emerald-200">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">Approved</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700 tracking-tight">{approvedCount}</div>
          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">{fmt(approvedValue)} converted</div>
        </div>

        <div className="p-3 sm:p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs hover:shadow-xs transition-all hover:border-blue-200">
          <div className="flex items-center justify-between text-blue-600 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-800">Sent to Client</span>
            <Send className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-blue-700 tracking-tight">{sentCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Awaiting decision</div>
        </div>

        <div className="p-3 sm:p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs hover:shadow-xs transition-all hover:border-amber-200">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">Rework Needed</span>
            <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-700 tracking-tight">{reworkCount}</div>
          <div className="text-[10px] text-amber-600 mt-0.5">Requires edit</div>
        </div>

        <div className="p-3 sm:p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs hover:shadow-xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Drafts</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-700 tracking-tight">{draftCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Pending dispatch</div>
        </div>
      </div>

      {/* 2. Search, Filter Toolbar & Section Title */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by quote #, client, project, or test item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: "all", label: "All", count: totalCount },
              { id: "draft", label: "Draft", count: draftCount },
              { id: "sent", label: "Sent", count: sentCount },
              { id: "approved", label: "Approved", count: approvedCount },
              { id: "rework", label: "Rework", count: reworkCount },
              { id: "rejected", label: "Rejected", count: rejectedCount },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    active
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      active ? "bg-white/20 text-white" : "bg-white text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Quotation List Content */}
      <div className="space-y-4">
        {filteredQuotations.length === 0 ? (
          <div className="py-16 px-4 text-center bg-white border border-dashed border-slate-200 rounded-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800">No quotations found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || statusFilter !== "all"
                  ? "No quotations match your current search or filter criteria. Try resetting filters."
                  : "Start by creating your first laboratory testing commercial quotation."}
              </p>
            </div>
            {onOpenCreateQuotation && (
              <button
                type="button"
                onClick={onOpenCreateQuotation}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all hover:scale-105 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create New Quotation
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            {pagination.paginatedData.map((q: any) => {
              const status = (q.status || "draft").toLowerCase();
              const versionNum = q.version_number || 1;
              const clientName = q.clients?.name || q.client?.name || "Unassigned Client";
              const projectName = q.projects?.name || q.project?.name || "General Project / Site";
              const quoteAmount = q.total_amount || q.amount || 0;

              return (
                <div
                  key={q.id}
                  onClick={() => router.push(`/accounting/quotations/${q.id}`)}
                  className="group relative p-5 rounded-2xl border border-slate-200 hover:border-blue-400 bg-white hover:shadow-md transition-all space-y-4 cursor-pointer"
                >
                  {/* Top Bar: Quotation No, Version, Status, and Total Amount */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-slate-900 group-hover:text-blue-600 text-base flex items-center gap-1.5 transition-colors">
                        <FileText className="w-4 h-4 text-blue-600" />
                        {q.quotation_no}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        V{versionNum}
                      </span>
                      {q.category && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
                          {q.category}
                        </span>
                      )}
                      {q.department && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                          {q.department}
                        </span>
                      )}
                      {getStatusBadge(status)}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Value</span>
                        <span className="text-base font-bold text-slate-900 nums">{fmt(quoteAmount)}</span>
                      </div>
                      <span className="text-xs text-blue-600 group-hover:translate-x-0.5 transition-transform font-bold hidden sm:inline-flex items-center gap-0.5">
                        View Details &rarr;
                      </span>
                    </div>
                  </div>

                  {/* Middle Row: Client, Project, Dates, and Clauses */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-semibold">Client</span>
                        <strong className="text-slate-800 font-semibold truncate block">{clientName}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-semibold">Project / Site</span>
                        <span className="text-slate-700 truncate block">{projectName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-semibold">Date Created</span>
                        <span className="text-slate-700 block">
                          {q.created_at ? new Date(q.created_at).toLocaleDateString("en-IN") : "N/A"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-semibold">Valid Until</span>
                        <span className="text-slate-700 block">{q.valid_until || "Standard 30 Days"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Items Summary Snippet */}
                  {q.items && q.items.length > 0 && (
                    <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 text-xs text-slate-700 flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-bold text-slate-500 mr-2 uppercase tracking-wider">Test Items:</span>
                        <span className="text-slate-800 font-medium">
                          {q.items.map((it: any) => `${it.description} (x${it.qty || 1})`).join(", ")}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                        {q.items.length} line item{q.items.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}

                  {/* Rework Instructions Banner */}
                  {q.rework_notes && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold mr-1">Rework Instructions:</strong>
                        <span>{q.rework_notes}</span>
                      </div>
                    </div>
                  )}

                  {/* Rejection Reason Banner */}
                  {q.rejection_reason && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold mr-1">Rejection Reason:</strong>
                        <span>{q.rejection_reason}</span>
                      </div>
                    </div>
                  )}

                  {/* Bottom Action Strip (Stop propagation so sub-actions don't just trigger whole card click) */}
                  <div
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/accounting/quotations/${q.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold cursor-pointer transition-all shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Details
                      </Link>

                      <Link
                        href={`/accounting/quotations/${q.id}?tab=history`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold cursor-pointer transition-all shadow-2xs"
                      >
                        <History className="w-3.5 h-3.5" /> History (V{versionNum})
                      </Link>

                      {(status === "rework" || status === "revision_requested" || status === "rejected") && (
                        <Link
                          href={`/accounting/quotations/new?revise=${q.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold cursor-pointer transition-all shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Revise (Draft V{versionNum + 1})
                        </Link>
                      )}

                      {status === "approved" && !q.inward_id && (
                        <button
                          type="button"
                          onClick={() => router.push(`/clients/new?quotation_id=${q.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold cursor-pointer transition-all shadow-2xs"
                        >
                          <Package className="w-3.5 h-3.5" /> Convert to Inward
                        </button>
                      )}

                      {(q.inward_id || status === "inward_created" || status === "accepted") && (
                        <button
                          type="button"
                          onClick={() => {
                            const targetInward = (data.recentInwards || []).find((inv: any) => inv.id === q.inward_id) || { id: q.inward_id, client_id: q.client_id, quotation_id: q.id };
                            if (onOpenCreateProforma) onOpenCreateProforma(targetInward, { quotationId: q.id });
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold cursor-pointer transition-all shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Create Proforma Invoice
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <QuotationApprovalPanel
                        quotation={q}
                        onRefresh={onRefresh}
                        onRevise={() => {
                          router.push(`/accounting/quotations/new?revise=${q.id}`);
                        }}
                        onConvertToInward={() => {
                          router.push(`/clients/new?quotation_id=${q.id}`);
                        }}
                        onConvertToProforma={() => {
                          const targetInward = (data.recentInwards || []).find((inv: any) => inv.id === q.inward_id) || { id: q.inward_id, client_id: q.client_id, quotation_id: q.id };
                          if (onOpenCreateProforma) onOpenCreateProforma(targetInward, { quotationId: q.id });
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredQuotations.length > 0 && (
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
            pageSizeOptions={[5, 10, 20, 50]}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            itemLabel="quotations"
          />
        )}
      </div>

      {/* Quotation Detail Modal (Document Preview, Full Items, T&C, Print, Approval Panel) */}
      <QuotationViewModal
        isOpen={!!selectedQuotationForView}
        onClose={() => setSelectedQuotationForView(null)}
        quotation={selectedQuotationForView}
        onRefresh={onRefresh}
        onConvertedToInvoice={(inv) => {
          setSelectedQuotationForView(null);
          if (onOpenViewInvoice) onOpenViewInvoice(inv);
        }}
        onRevise={(q) => {
          setSelectedQuotationForView(null);
          if (onReviseQuotation) onReviseQuotation(q);
        }}
        onConvertToInward={(q) => {
          setSelectedQuotationForView(null);
          router.push(`/clients/new?quotation_id=${q.id}`);
        }}
      />

      {/* Quotation Version History Modal */}
      <QuotationVersionHistory
        isOpen={!!selectedQuotationForHistory}
        onClose={() => setSelectedQuotationForHistory(null)}
        quotationId={selectedQuotationForHistory?.id || ""}
        quotationNo={selectedQuotationForHistory?.quotation_no}
        currentVersion={selectedQuotationForHistory?.version_number || 1}
      />
    </div>
  );
}

function Card({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-3 sm:p-3.5 bg-white border rounded-xl shadow-2xs transition-all hover:shadow-xs ${highlight ? "border-amber-200/80 bg-amber-50/40" : "border-slate-200/80 hover:border-slate-300"}`}>
      <div className={`text-[11px] font-semibold uppercase tracking-wider ${highlight ? "text-amber-700" : "text-slate-500"}`}>{label}</div>
      <div className={`text-xl font-bold tracking-tight mt-1 ${highlight ? "text-amber-900" : "text-slate-900"}`}>{value}</div>
    </div>
  );
}
function List({ title, items, render }: { title: string; items: any[]; render: (item: any) => React.ReactNode }) {
  return <div className="p-4 bg-white border rounded-2xl"><h4 className="font-medium mb-3">{title}</h4><div className="space-y-2">{items.length === 0 ? <div className="text-sm text-slate-400">None</div> : items.map((it, i) => <div key={i}>{render(it)}</div>)}</div></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="text-slate-600">{label}</span><div className="mt-1">{children}</div></label>;
}
