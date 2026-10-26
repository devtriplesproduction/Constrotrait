"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { PageHeader } from "@/components/modules/PageHeader";
import { Plus, Trash2, Check, X, Landmark, Scroll, FileText, Save, ArrowUp, ArrowDown, Eye, Star, Copy, CreditCard, Receipt, Banknote, BookOpen } from "lucide-react";
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

  // Record Expense modal state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedInwardForExpense, setSelectedInwardForExpense] = useState<any>(null);

  const handleOpenRecordExpense = (inward?: any) => {
    setSelectedInwardForExpense(inward || null);
    setIsExpenseModalOpen(true);
  };

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

  const headerActions = currentTab === "banks" ? (
    <Button
      variant="custom"
      size="none"
      onClick={handleOpenAddBankModal}
      className="h-[42px] px-5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-md shadow-orange-500/20 hover:shadow-orange-500/30 transition-all hover:scale-105 flex items-center gap-2 text-sm cursor-pointer"
    >
      <Plus className="w-4 h-4" />
      Add Bank Account
    </Button>
  ) : currentTab === "dashboard" || (currentTab === "billing" && billingSubTab === "invoices") || currentTab === "invoices" ? (
    <Button
      variant="custom"
      size="none"
      onClick={() => handleOpenCreateProforma()}
      className="h-[42px] px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all hover:scale-105 flex items-center gap-2 text-sm cursor-pointer"
    >
      <Plus className="w-4 h-4" />
      Create Proforma Invoice
    </Button>
  ) : (currentTab === "billing" && billingSubTab === "receipts") || currentTab === "receipts" ? (
    <Button
      variant="custom"
      size="none"
      onClick={() => setIsInwardReceiptModalOpen(true)}
      className="h-[42px] px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-md shadow-slate-900/20 hover:shadow-slate-900/30 transition-all hover:scale-105 flex items-center gap-2 text-sm cursor-pointer"
    >
      <Plus className="w-4 h-4" />
      New Inward Receipt
    </Button>
  ) : currentTab === "ledgers" || (currentTab === "billing" && billingSubTab === "expenses") || currentTab === "expenses" ? (
    <Button
      variant="custom"
      size="none"
      onClick={() => handleOpenRecordExpense()}
      className="h-[42px] px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md shadow-rose-500/20 hover:shadow-rose-500/30 transition-all hover:scale-105 flex items-center gap-2 text-sm cursor-pointer"
    >
      <Plus className="w-4 h-4" />
      Record Expense
    </Button>
  ) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        icon={currentTab === "banks" ? Landmark : currentTab === "templates" ? Scroll : currentTab === "billing" ? CreditCard : currentTab === "ledgers" ? BookOpen : undefined}
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
      {currentTab === "quotations" && <QuotationsTab data={data} run={run} pending={pending} />}
      {currentTab === "templates" && <TemplateManager initialTemplates={data.templates} />}
      {currentTab === "banks" && (
        <BankCards
          accounts={data.accounts || []}
          onAddNew={handleOpenAddBankModal}
          onEdit={handleOpenEditBankModal}
          onRefresh={refresh}
        />
      )}
      {currentTab === "recon" && <ReconTab data={data} run={run} pending={pending} />}
      {currentTab === "reports" && <ReportsTab />}

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
        }}
        inward={selectedInwardForExpense}
        inwards={data.recentInwards || []}
        categories={data.categories || []}
        accounts={data.accounts || []}
        projects={data.projects || []}
        onSuccess={refresh}
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

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setSubTab("invoices")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === "invoices"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Invoices ({ (data.invoices || []).length })
          </button>
          <button
            type="button"
            onClick={() => setSubTab("inwards")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === "inwards"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Inward Register (Create Proforma)</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">
              { (data.recentInwards || []).length }
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => onOpenCreateProforma()}
            className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 rounded-xl cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Proforma Invoice</span>
          </Button>
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

  const totalBilled = invoices.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
  const totalCollections = receipts
    .filter((r: any) => r.status !== "cancelled")
    .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  const totalOutstanding = invoices.reduce((s: number, i: any) => s + Number(i.balance_amount || 0), 0);
  const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Metric Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Total Billed</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{fmt(totalBilled)}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{invoices.length} invoices issued</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white border border-emerald-200/90 rounded-2xl shadow-xs bg-emerald-50/20 flex items-center justify-between">
          <div>
            <div className="text-xs text-emerald-700 font-semibold">Total Collections</div>
            <div className="text-xl font-bold text-emerald-900 mt-1">{fmt(totalCollections)}</div>
            <div className="text-[11px] text-emerald-600 mt-0.5">{receipts.length} payment receipts</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100/70 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white border border-amber-200/90 rounded-2xl shadow-xs bg-amber-50/20 flex items-center justify-between">
          <div>
            <div className="text-xs text-amber-700 font-semibold">Outstanding Due</div>
            <div className="text-xl font-bold text-amber-900 mt-1">{fmt(totalOutstanding)}</div>
            <div className="text-[11px] text-amber-600 mt-0.5">Pending client payments</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100/70 border border-amber-200 flex items-center justify-center text-amber-700">
            <ArrowUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Total Expenses</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{fmt(totalExpenses)}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{expenses.length} expenses logged</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Banknote className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Modern Sub-Tab Pill Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => onSubTabChange("invoices")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 flex-shrink-0 ${
              activeSubTab === "invoices"
                ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Invoices</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeSubTab === "invoices" ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-700"
            }`}>
              {invoices.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSubTabChange("receipts")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 flex-shrink-0 ${
              activeSubTab === "receipts"
                ? "bg-white text-emerald-800 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Receipts</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeSubTab === "receipts" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
            }`}>
              {receipts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSubTabChange("expenses")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 flex-shrink-0 ${
              activeSubTab === "expenses"
                ? "bg-white text-amber-800 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>Expenses</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeSubTab === "expenses" ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700"
            }`}>
              {expenses.length}
            </span>
          </button>
        </div>

        {/* Action button corresponding to subtab */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {activeSubTab === "invoices" && (
            <Button
              size="sm"
              onClick={() => onOpenCreateProforma()}
              className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 rounded-xl cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Proforma Invoice</span>
            </Button>
          )}
          {activeSubTab === "receipts" && (
            <Button
              size="sm"
              onClick={onOpenCreateReceipt}
              className="h-9 px-4 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white gap-1.5 rounded-xl cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Inward Receipt</span>
            </Button>
          )}
          {activeSubTab === "expenses" && (
            <Button
              size="sm"
              onClick={() => onOpenRecordExpense?.()}
              className="h-9 px-4 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1.5 rounded-xl cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Expense</span>
            </Button>
          )}
        </div>
      </div>

      {/* Subtab Content */}
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

function QuotationsTab({ data, run, pending }: any) {
  const [items, setItems] = useState([
    { description: "Concrete Cube Compressive Strength Testing (IS 516)", qty: 3, rate: 450 }
  ]);
  const [form, setForm] = useState({
    project_id: "",
    client_id: "",
    valid_until: "",
    discount_amount: "",
    gst_rate: "18",
    remarks: ""
  });

  const templates: any[] = data.templates || [];
  const defaultTemplate = templates.find((t) => t.is_default) || templates[0];

  // Active Clauses state
  const [activeClauses, setActiveClauses] = useState<any[]>(() => {
    if (defaultTemplate?.clauses && defaultTemplate.clauses.length > 0) {
      return JSON.parse(JSON.stringify(defaultTemplate.clauses));
    }
    return [
      {
        id: `cls-${Date.now()}-1`,
        title: "Testing Standards & Scope",
        content: "All tests are executed in strict accordance with relevant BIS / ASTM specifications. Results relate exclusively to the tested specimen.",
        display_order: 1
      },
      {
        id: `cls-${Date.now()}-2`,
        title: "Payment Terms",
        content: "50% advance mobilization payment required. Remaining 50% balance due prior to formal stamped test certificate release.",
        display_order: 2
      }
    ];
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(defaultTemplate?.id || "");
  const [selectedQuotationForView, setSelectedQuotationForView] = useState<any | null>(null);

  const pagination = usePagination({
    data: data.quotations || [],
    initialPageSize: 5,
  });

  // Financial calculations
  const subtotal = items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.rate || 0), 0);
  const discount = Number(form.discount_amount || 0);
  const taxable = Math.max(0, subtotal - discount);
  const gstRate = Number(form.gst_rate || 18);
  const gst = (taxable * gstRate) / 100;
  const total = taxable + gst;

  // Line item handlers
  function addItem() {
    setItems([...items, { description: "", qty: 1, rate: 0 }]);
  }
  function updateItem(i: number, k: string, v: any) {
    const n = [...items];
    (n[i] as any)[k] = v;
    setItems(n);
  }
  function removeItem(i: number) {
    if (items.length > 1) {
      setItems(items.filter((_, idx) => idx !== i));
    }
  }

  // Clause handlers (MaleeHouse-style)
  const handleLoadTemplate = (append = false) => {
    if (!selectedTemplateId) return;
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tpl) return;

    const newClauses = JSON.parse(JSON.stringify(tpl.clauses || [])).map((c: any, idx: number) => ({
      ...c,
      id: `cls-${Date.now()}-${idx + 1}`,
      display_order: idx + 1
    }));

    if (append) {
      setActiveClauses(prev => {
        const startIdx = prev.length;
        const appended = newClauses.map((c: any, i: number) => ({ ...c, display_order: startIdx + i + 1 }));
        return [...prev, ...appended];
      });
    } else {
      setActiveClauses(newClauses);
    }
  };

  const addCustomClause = () => {
    setActiveClauses(prev => [
      ...prev,
      {
        id: `cls-custom-${Date.now()}`,
        title: "",
        content: "",
        display_order: prev.length + 1
      }
    ]);
  };

  const updateClause = (idx: number, field: string, val: string) => {
    setActiveClauses(prev => {
      const n = [...prev];
      n[idx] = { ...n[idx], [field]: val };
      return n;
    });
  };

  const removeClause = (idx: number) => {
    setActiveClauses(prev => prev.filter((_, i) => i !== idx).map((c, i) => ({ ...c, display_order: i + 1 })));
  };

  const moveClause = (idx: number, dir: "up" | "down") => {
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === activeClauses.length - 1) return;
    setActiveClauses(prev => {
      const n = [...prev];
      const target = dir === "up" ? idx - 1 : idx + 1;
      [n[idx], n[target]] = [n[target], n[idx]];
      return n.map((c, i) => ({ ...c, display_order: i + 1 }));
    });
  };

  const handleSaveAsTemplate = async () => {
    const templateName = window.prompt("Enter a title for the new T&C template:");
    if (!templateName || !templateName.trim()) return;

    const res = await saveQuotationTemplateAction({
      name: templateName.trim(),
      category: "Material Testing",
      is_default: false,
      clauses: activeClauses
    });

    if (res.success) {
      alert("T&C Template saved successfully!");
    } else {
      alert("Failed to save template: " + res.error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some(it => !it.description.trim())) {
      alert("All line items must have a description");
      return;
    }

    const compiledTerms = activeClauses
      .map(c => `${(c.title || '').toUpperCase()}:\n${c.content || ''}`)
      .join('\n\n');

    run(
      () => createQuotationWithItemsAction({
        ...form,
        items,
        discount_amount: discount,
        gst_rate: gstRate,
        terms: compiledTerms,
        clauses: activeClauses
      }),
      "Quotation created successfully"
    );
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 items-start">
      {/* Quotation Creation Form - 7 cols */}
      <form className="lg:col-span-7 p-6 bg-white border border-slate-200 rounded-2xl space-y-6 shadow-xs" onSubmit={handleSubmit}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Create New Quotation</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">Testing & Engineering Services</span>
        </div>

        {/* Project & Client Reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Client Name">
            <select
              className={inputCls}
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            >
              <option value="">Select a Client</option>
              {(data.clients || []).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Project / Site">
            <select
              className={inputCls}
              value={form.project_id}
              onChange={(e) => setForm({ ...form, project_id: e.target.value })}
            >
              <option value="">General Project / Site</option>
              {(data.projects || []).map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Line Items Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">Line Items & Testing Parameters</label>
            <button
              type="button"
              onClick={addItem}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Line Item
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            <div className="grid grid-cols-12 gap-2 bg-slate-50 p-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <div className="col-span-6">Description of Test / Service</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Rate (₹)</div>
              <div className="col-span-2 text-right">Amount (₹)</div>
            </div>

            {items.map((it, i) => {
              const rowAmt = (Number(it.qty) || 0) * (Number(it.rate) || 0);
              return (
                <div key={i} className="grid grid-cols-12 gap-2 p-2.5 items-center bg-white hover:bg-slate-50/50">
                  <div className="col-span-6">
                    <input
                      required
                      className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:border-blue-500 outline-none"
                      placeholder="e.g. Compressive Strength Test"
                      value={it.description}
                      onChange={(e) => updateItem(i, "description", e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      className="w-full text-xs text-center border border-slate-200 rounded-lg py-1.5 focus:border-blue-500 outline-none"
                      value={it.qty}
                      onChange={(e) => updateItem(i, "qty", Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full text-xs text-right border border-slate-200 rounded-lg py-1.5 px-2 focus:border-blue-500 outline-none"
                      placeholder="0.00"
                      value={it.rate}
                      onChange={(e) => updateItem(i, "rate", Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-2 flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span className="w-full text-right">{fmt(rowAmt)}</span>
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      disabled={items.length <= 1}
                      className="text-slate-400 hover:text-rose-600 ml-1.5 disabled:opacity-20 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pricing & GST Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <Field label="Discount Amount (₹)">
            <input
              type="number"
              step="0.01"
              className={inputCls}
              placeholder="0.00"
              value={form.discount_amount}
              onChange={(e) => setForm({ ...form, discount_amount: e.target.value })}
            />
          </Field>
          <Field label="GST Rate">
            <select
              className={inputCls}
              value={form.gst_rate}
              onChange={(e) => setForm({ ...form, gst_rate: e.target.value })}
            >
              <option value="18">18% (Standard GST)</option>
              <option value="12">12% GST</option>
              <option value="5">5% GST</option>
              <option value="0">0% (Exempt)</option>
            </select>
          </Field>

          <div className="sm:col-span-2 pt-2 border-t border-slate-200 flex flex-wrap justify-between gap-4 text-xs">
            <div>Subtotal: <strong className="text-slate-900">{fmt(subtotal)}</strong></div>
            {discount > 0 && <div className="text-emerald-700">Discount: -{fmt(discount)}</div>}
            <div>GST ({gstRate}%): <strong className="text-slate-900">{fmt(gst)}</strong></div>
            <div className="text-sm font-bold text-blue-700">Total Quotation: {fmt(total)}</div>
          </div>
        </div>

        {/* MaleeHouse-style Terms & Conditions Clause Engine */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Scroll className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-bold text-slate-900">Legal Terms & Conditions Specification</h4>
            </div>

            {/* Template Actions */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={addCustomClause}
                className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Clause
              </button>
              <button
                type="button"
                onClick={handleSaveAsTemplate}
                disabled={activeClauses.length === 0}
                className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
              >
                <Save className="w-3 h-3" /> Save as Template
              </button>
            </div>
          </div>

          {/* Template Selector Bar */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                Select Pre-authorized T&C Template
              </label>
              <select
                className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2 bg-white outline-none focus:border-blue-500"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
              >
                <option value="">-- Choose a T&C Template --</option>
                {templates.map((tpl: any) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} ({tpl.category}) {tpl.is_default ? "★ Default" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-4 sm:pt-0">
              <button
                type="button"
                onClick={() => handleLoadTemplate(false)}
                disabled={!selectedTemplateId}
                className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-40 cursor-pointer shadow-xs"
              >
                Load Template
              </button>
              <button
                type="button"
                onClick={() => handleLoadTemplate(true)}
                disabled={!selectedTemplateId}
                className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg transition-all disabled:opacity-40 cursor-pointer"
              >
                Append Clauses
              </button>
            </div>
          </div>

          {/* Active Clauses Cards List */}
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {activeClauses.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                No clauses loaded. Select a template above or click "+ Add Clause" to specify custom terms.
              </div>
            ) : (
              activeClauses.map((clause, idx) => (
                <div key={clause.id || idx} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="w-5 h-5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        value={clause.title}
                        onChange={(e) => updateClause(idx, "title", e.target.value)}
                        placeholder="Clause Heading (e.g. Payment Schedule, Warranty Limits)"
                        className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400"
                      />
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => moveClause(idx, "up")}
                        disabled={idx === 0}
                        title="Move Up"
                        className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveClause(idx, "down")}
                        disabled={idx === activeClauses.length - 1}
                        title="Move Down"
                        className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeClause(idx)}
                        title="Remove Clause"
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3 relative">
                    <textarea
                      value={clause.content}
                      onChange={(e) => updateClause(idx, "content", e.target.value)}
                      placeholder="Detailed contractual clause terms or testing limitations..."
                      rows={2}
                      maxLength={500}
                      className="w-full text-xs text-slate-700 bg-transparent border border-slate-200 rounded-lg p-2 pb-5 outline-none focus:border-blue-500 resize-none leading-relaxed"
                    />
                    <div className="absolute bottom-4 right-4 text-[10px] text-slate-400 pointer-events-none">
                      {clause.content?.length || 0}/500
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Valid until and remarks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Quotation Validity Date">
            <input
              type="date"
              className={inputCls}
              value={form.valid_until}
              onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
            />
          </Field>
          <Field label="Internal Remarks / Notes">
            <input
              className={inputCls}
              placeholder="Internal tracking remarks..."
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            />
          </Field>
        </div>

        <button
          disabled={pending || items.length === 0}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
        >
          {pending ? "Saving Quotation..." : "Create Quotation with Authorized T&C"}
        </button>
      </form>

      {/* Existing Quotations List - 5 cols */}
      <div className="lg:col-span-5 space-y-4">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="font-bold text-slate-900 text-sm">Recent Quotations</h4>
            <span className="text-xs text-slate-500 font-semibold">{ (data.quotations || []).length } quotes</span>
          </div>

          {(data.quotations || []).length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No quotations created yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
              {pagination.paginatedData.map((q: any) => (
                <div
                  key={q.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">{q.quotation_no}</span>
                    <span className="text-xs font-bold text-blue-700">{fmt(q.total_amount || q.amount)}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Date: {q.created_at ? new Date(q.created_at).toLocaleDateString("en-IN") : "N/A"}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold uppercase text-[9px]">
                      {q.status || "Draft"}
                    </span>
                  </div>

                  {q.valid_until && (
                    <div className="text-[11px] text-slate-500">
                      Valid Until: <span className="font-medium text-slate-700">{q.valid_until}</span>
                    </div>
                  )}

                  {q.items && q.items.length > 0 && (
                    <div className="text-[11px] text-slate-600 line-clamp-1 border-t border-slate-200/60 pt-1.5">
                      Items: {q.items.map((it: any) => it.description).join(", ")}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <span className="text-[10px] text-slate-400 font-medium">
                      {q.clauses?.length || 0} T&C clauses attached
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedQuotationForView(q)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(data.quotations || []).length > 0 && (
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              pageSizeOptions={[5, 10, 20]}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
              itemLabel="quotations"
            />
          )}
        </div>
      </div>

      {/* Quotation Detail Modal */}
      {selectedQuotationForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Quotation: {selectedQuotationForView.quotation_no}</h3>
                <p className="text-xs text-slate-500">Status: {selectedQuotationForView.status?.toUpperCase()}</p>
              </div>
              <button
                onClick={() => setSelectedQuotationForView(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Line Items */}
            {selectedQuotationForView.items && selectedQuotationForView.items.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700">Line Items</span>
                <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-bold">
                    <tr>
                      <th className="p-2 text-left">Description</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedQuotationForView.items.map((it: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-2 font-medium">{it.description}</td>
                        <td className="p-2 text-center">{it.qty}</td>
                        <td className="p-2 text-right">{fmt(it.rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Financial summary */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between"><span>Subtotal:</span><span>{fmt(selectedQuotationForView.subtotal || selectedQuotationForView.amount)}</span></div>
              <div className="flex justify-between"><span>GST:</span><span>{fmt(selectedQuotationForView.gst_amount || 0)}</span></div>
              <div className="flex justify-between font-bold text-sm text-blue-700 pt-1 border-t border-slate-200">
                <span>Total Amount:</span><span>{fmt(selectedQuotationForView.total_amount || selectedQuotationForView.amount)}</span>
              </div>
            </div>

            {/* Clauses */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700">Attached Terms & Conditions</span>
              {selectedQuotationForView.clauses && selectedQuotationForView.clauses.length > 0 ? (
                <div className="space-y-2 pl-3 border-l-2 border-blue-500">
                  {selectedQuotationForView.clauses.map((c: any, idx: number) => (
                    <div key={idx} className="text-xs text-slate-600 leading-relaxed">
                      <strong className="text-slate-800">{c.display_order || idx + 1}. {c.title}:</strong>{" "}
                      <span>{c.content}</span>
                    </div>
                  ))}
                </div>
              ) : selectedQuotationForView.terms ? (
                <div className="p-3 rounded-lg bg-slate-50 text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                  {selectedQuotationForView.terms}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No specific terms attached.</p>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedQuotationForView(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




function ReconTab({ data, run, pending }: any) {
  const [accountId, setAccountId] = useState("");
  const [statementDate, setStatementDate] = useState("");
  const [statementBalance, setStatementBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [erpBalance, setErpBalance] = useState<number | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (accountId) {
      getBankReconciliationsAction(accountId).then((r: any) => setHistory(r.success ? r.data || [] : []));
    }
  }, [accountId]);

  async function calc() {
    // Simple ERP balance from account current_balance for demo; real calc would sum receipts - expenses for date
    const acc = (data.accounts || []).find((a: any) => a.id === accountId);
    setErpBalance(acc ? Number(acc.current_balance) : 0);
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="p-5 bg-white border rounded-2xl space-y-3">
        <h3 className="font-medium">Bank Reconciliation</h3>
        <Field label="Account"><select className={inputCls} value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">Select</option>{(data.accounts || []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
        <Field label="Statement Date"><input type="date" className={inputCls} value={statementDate} onChange={(e) => setStatementDate(e.target.value)} /></Field>
        <button type="button" onClick={calc} className="px-3 py-2 bg-slate-200 rounded text-sm">Calculate ERP Balance</button>
        {erpBalance !== null && <div className="text-sm">ERP Balance: {fmt(erpBalance)}</div>}
        <Field label="Statement Balance"><input type="number" step="0.01" className={inputCls} value={statementBalance} onChange={(e) => setStatementBalance(e.target.value)} /></Field>
        {erpBalance !== null && statementBalance && <div className="text-sm">Difference: {fmt(Number(statementBalance) - erpBalance)}</div>}
        <Field label="Notes"><textarea className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <button disabled={pending || !accountId || !statementDate || !statementBalance} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm" onClick={() => run(() => saveBankReconciliationAction({ account_id: accountId, statement_date: statementDate, statement_balance: Number(statementBalance), erp_balance: erpBalance || 0, notes }), "Reconciliation saved")}>Save Reconciliation</button>
      </div>
      <List title="Reconciliation History" items={history} render={(h: any) => <div className="text-sm">{h.statement_date} · Diff {fmt(h.difference)}</div>} />
    </div>
  );
}

function ReportsTab() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pnl, setPnl] = useState<any>(null);
  return (
    <div className="p-5 bg-white border rounded-2xl space-y-3 max-w-lg">
      <h3 className="font-medium">Profit & Loss</h3>
      <div className="flex gap-2"><input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} /><input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} /></div>
      <button className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm" onClick={async () => { const r = await getProfitAndLossAction(from, to); if (r.success) setPnl(r.data); }}>Generate</button>
      {pnl && <div className="text-sm space-y-1"><div>Income: {fmt(pnl.totalIncome)}</div><div>Expense: {fmt(pnl.totalExpense)}</div><div className="font-medium">Profit: {fmt(pnl.profit)}</div></div>}
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
