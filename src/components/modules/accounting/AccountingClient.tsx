"use client";

import React, { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { PageHeader } from "@/components/modules/PageHeader";
import { Plus, Trash2, Check, X, Landmark, Scroll, FileText, Save, ArrowUp, ArrowDown, ArrowUpRight, Clock, Eye, Star, Copy, CreditCard, Receipt, Banknote, BookOpen, FlaskConical, FileSpreadsheet, History, AlertCircle, Edit3, Send, CheckCircle2, XCircle, RefreshCw, Search, Building, Briefcase, Calendar, DollarSign, Filter, ArrowUpDown } from "lucide-react";
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

  // Quotation creation / revision modal state
  const [isCreateQuotationModalOpen, setIsCreateQuotationModalOpen] = useState(false);
  const [revisingQuotation, setRevisingQuotation] = useState<any | null>(null);

  const handleOpenCreateQuotation = (qToRevise?: any) => {
    setRevisingQuotation(qToRevise || null);
    setIsCreateQuotationModalOpen(true);
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

  const headerActions = currentTab === "billing" ? null : currentTab === "banks" ? (
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
        />
      )}
      {currentTab === "templates" && <TemplateManager initialTemplates={data.templates} />}
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
      />
    </div>
  );
}

function InvoicesTab({
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
  const [subTab, setSubTab] = useState<"invoices" | "inwards">("invoices");
  const invoicesCount = (data.invoices || []).length;
  const inwardsCount = (data.recentInwards || []).length;
  const unbilledInwards = (data.recentInwards || []).filter((j: any) => !j.invoices || j.invoices.length === 0).length;

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-xl">
          <button
            type="button"
            onClick={() => setSubTab("invoices")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
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

          <button
            type="button"
            onClick={() => setSubTab("inwards")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              subTab === "inwards"
                ? "bg-white text-indigo-700 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Inward Register (Ready for Billing)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                subTab === "inwards" ? "bg-indigo-100 text-indigo-800" : "bg-slate-200 text-slate-700"
              }`}
            >
              {inwardsCount}
            </span>
            {unbilledInwards > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title={`${unbilledInwards} unbilled inwards`} />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {subTab === "inwards" ? (
            <div className="text-[11px] text-slate-500 hidden sm:block">
              {unbilledInwards > 0 ? (
                <span className="text-amber-800 font-bold bg-amber-50 border border-amber-200/80 px-3 py-1 rounded-xl shadow-2xs inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>{unbilledInwards} inwards awaiting billing</span>
                </span>
              ) : (
                <span className="text-emerald-800 font-bold bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-xl shadow-2xs inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>All inwards invoiced</span>
                </span>
              )}
            </div>
          ) : (
            <div className="text-[11px] font-medium text-slate-400 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200/60 hidden sm:flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>Proforma and Tax Invoices with realtime payment tracking</span>
            </div>
          )}
        </div>
      </div>

      {/* Subtab View */}
      {subTab === "invoices" ? (
        <InvoicesListTable
          invoices={data.invoices || []}
          onViewInvoice={onOpenViewInvoice}
          onRecordPayment={onOpenRecordPayment}
          onViewReceipt={onOpenViewReceipt}
          onCreateRemainingInvoice={onOpenCreateProforma}
        />
      ) : (
        <InwardRegisterTable
          inwards={data.recentInwards || []}
          onCreateProforma={onOpenCreateProforma}
          onViewInvoice={onOpenViewInvoice}
          onRecordExpense={onOpenRecordExpense}
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
  const invoices = data.invoices || [];
  const receipts = data.receipts || data.recentReceipts || [];
  const expenses = data.expenses || [];
  const inwards = data.recentInwards || [];

  const totalBilled = invoices.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
  const totalCollections = receipts
    .filter((r: any) => r.status !== "cancelled")
    .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  const totalOutstanding = invoices.reduce((s: number, i: any) => s + Number(i.balance_amount || 0), 0);
  const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

  const collectionRate = totalBilled > 0 ? Math.min(100, Math.round((totalCollections / totalBilled) * 100)) : 0;
  const netCashFlow = totalCollections - totalExpenses;
  const unpaidCount = invoices.filter((i: any) => Number(i.balance_amount || 0) > 0).length;
  const proformaCount = invoices.filter((i: any) => i.invoice_type === "proforma").length;
  const taxCount = invoices.filter((i: any) => i.invoice_type !== "proforma").length;
  const verifiedReceiptsCount = receipts.filter((r: any) => r.status !== "cancelled").length;

  return (
    <div className="space-y-6">
      {/* ================= Master Financial Intelligence Hero ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Invoiced / Billed */}
        <div className="p-5 bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 border border-slate-200/90 rounded-2xl shadow-xs hover:shadow-md hover:border-blue-300 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Invoiced (Billed)
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs group-hover:scale-105 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-[28px] font-black text-slate-900 tracking-tight mt-2 font-mono">
            {fmt(totalBilled)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2.5 pt-2 border-t border-slate-100">
            <span>{invoices.length} invoices issued</span>
            <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full text-[10px]">
              {proformaCount} PI · {taxCount} Tax
            </span>
          </div>
        </div>

        {/* Card 2: Realized Collections */}
        <div className="p-5 bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/30 border border-emerald-200/90 rounded-2xl shadow-xs hover:shadow-md hover:border-emerald-400 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Realized Collections
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100/80 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs group-hover:scale-105 transition-transform">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-[28px] font-black text-emerald-950 tracking-tight mt-2 font-mono">
            {fmt(totalCollections)}
          </div>

          {/* Efficiency Progress Track */}
          <div className="mt-2.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 mb-1">
              <span>Collection Realization</span>
              <span className="font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded text-[10px]">
                {collectionRate}%
              </span>
            </div>
            <div className="w-full bg-emerald-100/80 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${collectionRate}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-emerald-700 mt-2.5 pt-2 border-t border-emerald-100/80">
            <span>{verifiedReceiptsCount} verified vouchers</span>
            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Realized</span>
            </span>
          </div>
        </div>

        {/* Card 3: Receivables Pending (Outstanding Due) */}
        <div className="p-5 bg-gradient-to-br from-amber-50/40 via-white to-orange-50/30 border border-amber-200/90 rounded-2xl shadow-xs hover:shadow-md hover:border-amber-400 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Outstanding Due
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-100/80 border border-amber-200 flex items-center justify-center text-amber-700 shadow-2xs group-hover:scale-105 transition-transform">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-[28px] font-black text-amber-950 tracking-tight mt-2 font-mono">
            {fmt(totalOutstanding)}
          </div>
          <div className="flex items-center justify-between text-xs text-amber-700 mt-2.5 pt-2 border-t border-amber-100/80">
            <span>{unpaidCount} unpaid/partial invoices</span>
            <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
              Pending Clearance
            </span>
          </div>
        </div>

        {/* Card 4: Outflows & Net Spread */}
        <div className="p-5 bg-gradient-to-br from-purple-50/40 via-white to-slate-50/50 border border-purple-200/90 rounded-2xl shadow-xs hover:shadow-md hover:border-purple-400 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">
              Outflows & Net Cash
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-100/80 border border-purple-200 flex items-center justify-center text-purple-700 shadow-2xs group-hover:scale-105 transition-transform">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-[28px] font-black text-slate-900 tracking-tight mt-2 font-mono">
            {fmt(totalExpenses)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 mt-2.5 pt-2 border-t border-slate-100">
            <span>Net Operating Margin</span>
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded-full text-[10px] ${
                netCashFlow >= 0
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {netCashFlow >= 0 ? "+" : ""}
              {fmt(netCashFlow)}
            </span>
          </div>
        </div>
      </div>

      {/* ================= Modern Unified Navigation Toolbar ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-xl overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => onSubTabChange("invoices")}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 flex-shrink-0 ${
              activeSubTab === "invoices"
                ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Invoices & Billing</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeSubTab === "invoices"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {invoices.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSubTabChange("receipts")}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 flex-shrink-0 ${
              activeSubTab === "receipts"
                ? "bg-white text-emerald-800 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Collections & Receipts</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeSubTab === "receipts"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {receipts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSubTabChange("expenses")}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 flex-shrink-0 ${
              activeSubTab === "expenses"
                ? "bg-white text-purple-800 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>Outflows & Expenses</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeSubTab === "expenses"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {expenses.length}
            </span>
          </button>
        </div>

        {/* Primary Action Button corresponding to Sub-Tab */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {activeSubTab === "invoices" && (
            <Button
              size="sm"
              onClick={() => onOpenCreateProforma()}
              className="h-10 px-4.5 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white gap-2 rounded-xl cursor-pointer shadow-md shadow-blue-500/20 hover:scale-[1.02] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Proforma Invoice</span>
            </Button>
          )}
          {activeSubTab === "receipts" && (
            <Button
              size="sm"
              onClick={onOpenCreateReceipt}
              className="h-10 px-4.5 text-xs font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 hover:from-black hover:to-slate-800 text-white gap-2 rounded-xl cursor-pointer shadow-md shadow-slate-900/20 hover:scale-[1.02] transition-all"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>New Inward Receipt</span>
            </Button>
          )}
          {activeSubTab === "expenses" && (
            <Button
              size="sm"
              onClick={() => onOpenRecordExpense?.()}
              className="h-10 px-4.5 text-xs font-bold bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white gap-2 rounded-xl cursor-pointer shadow-md shadow-rose-500/20 hover:scale-[1.02] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </Button>
          )}
        </div>
      </div>

      {/* ================= Sub-Tab Content ================= */}
      {activeSubTab === "invoices" && (
        <InvoicesTab
          data={data}
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
}: any) {
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Total Quotations</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{totalCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{fmt(totalValue)} total value</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs transition-all hover:border-emerald-200">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-xs font-medium text-slate-500">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700">{approvedCount}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">{fmt(approvedValue)} converted</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs transition-all hover:border-blue-200">
          <div className="flex items-center justify-between text-blue-600 mb-1">
            <span className="text-xs font-medium text-slate-500">Sent to Client</span>
            <Send className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-blue-700">{sentCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Awaiting client decision</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs transition-all hover:border-amber-200">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-xs font-medium text-slate-500">Rework Needed</span>
            <RefreshCw className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-700">{reworkCount}</div>
          <div className="text-[11px] text-amber-600 mt-0.5">Requires technical edit</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Drafts</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-700">{draftCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Pending dispatch</div>
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
                  onClick={() => setSelectedQuotationForView(q)}
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
                      <button
                        type="button"
                        onClick={() => setSelectedQuotationForView(q)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold cursor-pointer transition-all shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview & Details
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedQuotationForHistory(q)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold cursor-pointer transition-all shadow-2xs"
                      >
                        <History className="w-3.5 h-3.5" /> History (V{versionNum})
                      </button>

                      {(status === "rework" || status === "revision_requested" || status === "rejected") && (
                        <button
                          type="button"
                          onClick={() => {
                            if (onReviseQuotation) onReviseQuotation(q);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold cursor-pointer transition-all shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Revise (Draft V{versionNum + 1})
                        </button>
                      )}

                      {(status === "approved" || status === "accepted") && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Convert Approved Quotation ${q.quotation_no} to Proforma Invoice?`)) {
                              run(
                                () => convertQuotationToProformaAction(q.id),
                                `Generated Proforma Invoice from ${q.quotation_no}`
                              );
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold cursor-pointer transition-all shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Convert to Proforma
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <QuotationApprovalPanel
                        quotation={q}
                        onRefresh={onRefresh}
                        onRevise={() => {
                          if (onReviseQuotation) onReviseQuotation(q);
                        }}
                        onConvertToProforma={() => {
                          if (confirm(`Convert Quotation ${q.quotation_no} to Proforma Invoice?`)) {
                            run(
                              () => convertQuotationToProformaAction(q.id),
                              `Generated Proforma Invoice from ${q.quotation_no}`
                            );
                          }
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
    <div className={`p-4 bg-white border rounded-2xl shadow-xs transition-all ${highlight ? "border-amber-200 bg-amber-50/40" : "border-slate-200"}`}>
      <div className={`text-xs ${highlight ? "text-amber-700 font-semibold" : "text-slate-500"}`}>{label}</div>
      <div className={`text-xl font-bold ${highlight ? "text-amber-900" : "text-slate-900"}`}>{value}</div>
    </div>
  );
}
function List({ title, items, render }: { title: string; items: any[]; render: (item: any) => React.ReactNode }) {
  return <div className="p-4 bg-white border rounded-2xl"><h4 className="font-medium mb-3">{title}</h4><div className="space-y-2">{items.length === 0 ? <div className="text-sm text-slate-400">None</div> : items.map((it, i) => <div key={i}>{render(it)}</div>)}</div></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="text-slate-600">{label}</span><div className="mt-1">{children}</div></label>;
}
