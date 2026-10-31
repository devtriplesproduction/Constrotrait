"use client";

import React, { useState, useEffect, useMemo, startTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Plus,
  Trash2,
  Scroll,
  Save,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  AlertCircle,
  Loader2,
  Calendar,
  Building,
  Briefcase,
  DollarSign,
  CheckCircle2,
  Calculator,
  RotateCcw,
  Sparkles,
  Layers,
  FileCheck2,
  BadgePercent,
  Hash,
  HelpCircle,
  User,
  Phone,
  Mail,
  FileSpreadsheet,
  MapPin,
  Check,
  FlaskConical,
  ShieldCheck,
  ShieldAlert,
  Building2,
  Trees,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils/cn";
import { numberToWordsINR } from "@/utils/numberToWords";
import {
  createQuotationWithItemsAction,
  reviseQuotationAction,
  saveQuotationTemplateAction,
  getQuotationTemplatesAction,
  createClientAction,
} from "@/actions/accounting.actions";
import { QuickCreateClientModal } from "@/components/modules/clients/QuickCreateClientModal";
import { SelectTestModal, formatTestCatalogLabel, TestCatalogItem } from "./SelectTestModal";

export const QUOTATION_CATEGORIES = [
  "NABL",
  "Non-NABL",
] as const;

export const QUOTATION_DEPARTMENTS = [
  "Construction",
  "Environment",
] as const;

interface QuotationFormPageClientProps {
  initialClients: any[];
  initialProjects: any[];
  initialTemplates: any[];
  revisingQuotation?: any | null;
  testMasters?: any[];
  returnUrl?: string;
}

const fmt = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function QuotationFormPageClient({
  initialClients = [],
  initialProjects = [],
  initialTemplates = [],
  revisingQuotation = null,
  testMasters = [],
  returnUrl = "/accounting/quotations",
}: QuotationFormPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const isRevising = Boolean(revisingQuotation);
  const nextVersionNumber = (revisingQuotation?.version_number || 1) + 1;

  // Local state for clients and projects (supports quick creation)
  const [clientsList, setClientsList] = useState<any[]>(initialClients);
  const [projectsList, setProjectsList] = useState<any[]>(initialProjects);
  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);

  // Client mode: choose existing client or fill new client inline
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [newClientData, setNewClientData] = useState({
    name: "",
    contact_person: "",
    mobile: "",
    email: "",
    gst_no: "",
    address: "",
    site_name: "",
  });

  useEffect(() => {
    if (initialClients && initialClients.length > 0) {
      setClientsList(initialClients);
    }
  }, [initialClients]);

  useEffect(() => {
    if (initialProjects && initialProjects.length > 0) {
      setProjectsList(initialProjects);
    }
  }, [initialProjects]);

  const handleClientCreated = (newClient: any, newProject?: any) => {
    setClientsList((prev) => [newClient, ...prev.filter((c) => c.id !== newClient.id)]);
    setForm((prev) => ({
      ...prev,
      client_id: newClient.id,
      project_id: newProject?.id || prev.project_id,
    }));
    if (newProject) {
      setProjectsList((prev) => [newProject, ...prev.filter((p) => p.id !== newProject.id)]);
    }
  };

  // Initialize line items
  const [items, setItems] = useState<any[]>(() => {
    if (revisingQuotation && Array.isArray(revisingQuotation.items) && revisingQuotation.items.length > 0) {
      return revisingQuotation.items.map((it: any) => ({
        description: it.description || "",
        qty: it.qty || 1,
        rate: it.rate || 0,
      }));
    }
    return [{ description: "Concrete Cube Compressive Strength Testing (IS 516)", qty: 3, rate: 450 }];
  });

  // Calculate default valid_until date (30 days from now)
  const defaultValidDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  }, []);

  // Form general state
  const [form, setForm] = useState({
    client_id: revisingQuotation?.client_id || "",
    project_id: revisingQuotation?.project_id || "",
    valid_until: revisingQuotation?.valid_until || defaultValidDate,
    discount_amount: revisingQuotation?.discount_amount ? String(revisingQuotation.discount_amount) : "",
    gst_rate: revisingQuotation?.gst_rate !== undefined ? String(revisingQuotation.gst_rate) : "18",
    remarks: revisingQuotation?.remarks || "",
    category: (revisingQuotation?.category === "Non-NABL" ? "Non-NABL" : "NABL") as "NABL" | "Non-NABL",
    department: (revisingQuotation?.department?.toLowerCase().includes("environ") ? "Environment" : "Construction") as "Construction" | "Environment",
    revision_reason: revisingQuotation
      ? `Revised line items and commercial terms as requested for V${nextVersionNumber}`
      : "",
  });

  const [isSelectTestModalOpen, setIsSelectTestModalOpen] = useState(false);

  // Filter test catalog strictly based on selected Category and Department
  const filteredTestMasters = useMemo(() => {
    if (!Array.isArray(testMasters)) return [];
    return testMasters.filter((t: any) => {
      // 1. Category: NABL vs Non-NABL
      const isNabl = Boolean(t.is_nabl);
      if (form.category === "NABL" && !isNabl) return false;
      if (form.category === "Non-NABL" && isNabl) return false;

      // 2. Department: Construction vs Environment
      const testCat = (t.category || "").toLowerCase();
      if (form.department === "Construction" && !testCat.includes("construction")) return false;
      if (form.department === "Environment" && !testCat.includes("environ")) return false;

      return true;
    });
  }, [testMasters, form.category, form.department]);

  const handleSelectTestsFromCatalog = (selected: TestCatalogItem[]) => {
    if (!selected || selected.length === 0) return;
    setItems((prev) => {
      const isFirstRowEmpty =
        prev.length === 1 && (!prev[0].description || prev[0].description.trim() === "");

      const newRows = selected.map((t) => ({
        test_master_id: t.id,
        description: formatTestCatalogLabel(t),
        qty: t.sample_size ? Number(t.sample_size) || 1 : 1,
        rate: Number(t.rate) || 0,
      }));

      if (isFirstRowEmpty) {
        return newRows;
      }
      return [...prev, ...newRows];
    });

    toast({
      title: "Tests Added",
      description: `Added ${selected.length} test parameter${selected.length > 1 ? "s" : ""} to quotation line items.`,
    });
  };

  const handleQuickAddTest = (testId: string) => {
    if (!testId) return;
    const matched = filteredTestMasters.find((t: any) => t.id === testId);
    if (matched) {
      handleSelectTestsFromCatalog([matched]);
    }
  };

  const selectedClientInfo = useMemo(() => {
    if (!form.client_id) return null;
    return clientsList.find((c: any) => c.id === form.client_id) || null;
  }, [form.client_id, clientsList]);

  // Templates & active legal clauses
  const [templates, setTemplates] = useState<any[]>(initialTemplates || []);
  const [isRefreshingTemplates, setIsRefreshingTemplates] = useState(false);

  useEffect(() => {
    if (Array.isArray(initialTemplates) && initialTemplates.length > 0) {
      setTemplates(initialTemplates);
    }
  }, [initialTemplates]);

  const defaultTemplate = useMemo(() => {
    return templates.find((t) => t.is_default) || templates[0];
  }, [templates]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    return defaultTemplate?.id || "";
  });

  const [activeClauses, setActiveClauses] = useState<any[]>(() => {
    if (revisingQuotation && Array.isArray(revisingQuotation.clauses) && revisingQuotation.clauses.length > 0) {
      return JSON.parse(JSON.stringify(revisingQuotation.clauses));
    }
    if (defaultTemplate?.clauses && defaultTemplate.clauses.length > 0) {
      return JSON.parse(JSON.stringify(defaultTemplate.clauses));
    }
    return [
      {
        id: `cls-${Date.now()}-1`,
        title: "Testing Standards & Scope",
        content:
          "All tests are executed in strict accordance with relevant BIS / ASTM specifications. Results relate exclusively to the tested specimen.",
        display_order: 1,
      },
      {
        id: `cls-${Date.now()}-2`,
        title: "Payment Terms",
        content:
          "50% advance mobilization payment required. Remaining 50% balance due prior to formal stamped test certificate release.",
        display_order: 2,
      },
    ];
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Financial calculations
  const subtotal = useMemo(() => {
    return items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0);
  }, [items]);

  const discount = useMemo(() => {
    return Math.max(0, Number(form.discount_amount || 0));
  }, [form.discount_amount]);

  const taxable = useMemo(() => {
    return Math.max(0, subtotal - discount);
  }, [subtotal, discount]);

  const gstRate = useMemo(() => {
    return Number(form.gst_rate || 18);
  }, [form.gst_rate]);

  const gst = useMemo(() => {
    return (taxable * gstRate) / 100;
  }, [taxable, gstRate]);

  const total = useMemo(() => {
    return taxable + gst;
  }, [taxable, gst]);

  const amountInWords = useMemo(() => {
    return numberToWordsINR(total);
  }, [total]);

  // Line item handlers
  function addItem() {
    setItems((prev) => [...prev, { description: "", qty: 1, rate: 0 }]);
  }

  function updateItem(i: number, k: string, v: any) {
    setItems((prev) => {
      const n = [...prev];
      n[i] = { ...n[i], [k]: v };
      if (k === "description" && testMasters?.length) {
        const valStr = String(v).trim().toLowerCase();
        const matched = testMasters.find(
          (tm: any) =>
            formatTestCatalogLabel(tm).toLowerCase() === valStr ||
            tm.specific_test?.toLowerCase() === valStr ||
            tm.component_parameter?.toLowerCase() === valStr ||
            (tm.particulars && tm.particulars.toLowerCase() === valStr)
        );
        if (matched) {
          n[i].test_master_id = matched.id;
          if ((!n[i].rate || n[i].rate === 0) && matched.rate) {
            n[i].rate = Number(matched.rate);
          }
        }
      }
      return n;
    });
  }

  function removeItem(i: number) {
    if (items.length > 1) {
      setItems((prev) => prev.filter((_, idx) => idx !== i));
    }
  }

  // Clause handlers
  const handleLoadTemplate = (append = false) => {
    if (!selectedTemplateId) return;
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tpl) return;

    const newClauses = JSON.parse(JSON.stringify(tpl.clauses || [])).map((c: any, idx: number) => ({
      ...c,
      id: `cls-${Date.now()}-${idx + 1}`,
      display_order: idx + 1,
    }));

    if (append) {
      setActiveClauses((prev) => {
        const startIdx = prev.length;
        const appended = newClauses.map((c: any, i: number) => ({ ...c, display_order: startIdx + i + 1 }));
        return [...prev, ...appended];
      });
      toast({
        title: "Clauses Appended",
        description: `Appended ${newClauses.length} clause(s) from template "${tpl.name}".`,
      });
    } else {
      setActiveClauses(newClauses);
      toast({
        title: "Template Loaded",
        description: `Loaded ${newClauses.length} clause(s) from template "${tpl.name}".`,
      });
    }
  };

  const refreshTemplatesList = async () => {
    setIsRefreshingTemplates(true);
    try {
      const res: any = await getQuotationTemplatesAction();
      if (res.success && Array.isArray(res.data)) {
        setTemplates(res.data);
        toast({
          title: "Templates Refreshed",
          description: `Loaded ${res.data.length} template${res.data.length !== 1 ? "s" : ""}.`,
        });
      } else {
        toast({
          title: "Refresh Failed",
          description: ("error" in res && res.error) || "Could not refresh templates.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Refresh Failed",
        description: err?.message || "Could not refresh templates.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshingTemplates(false);
    }
  };

  const addCustomClause = () => {
    setActiveClauses((prev) => [
      ...prev,
      {
        id: `cls-custom-${Date.now()}`,
        title: "",
        content: "",
        display_order: prev.length + 1,
      },
    ]);
  };

  const updateClause = (idx: number, field: string, val: string) => {
    setActiveClauses((prev) => {
      const n = [...prev];
      n[idx] = { ...n[idx], [field]: val };
      return n;
    });
  };

  const removeClause = (idx: number) => {
    setActiveClauses((prev) => prev.filter((_, i) => i !== idx).map((c, i) => ({ ...c, display_order: i + 1 })));
  };

  const moveClause = (idx: number, dir: "up" | "down") => {
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === activeClauses.length - 1) return;
    setActiveClauses((prev) => {
      const n = [...prev];
      const target = dir === "up" ? idx - 1 : idx + 1;
      [n[idx], n[target]] = [n[target], n[idx]];
      return n.map((c, i) => ({ ...c, display_order: i + 1 }));
    });
  };

  const handleSaveAsTemplate = async () => {
    const templateName = window.prompt("Enter a title for the new T&C template:");
    if (!templateName || !templateName.trim()) return;

    // Use current form department / category if applicable
    const categoryName =
      form.department === "Environment"
        ? "Soil Investigation"
        : form.category === "NABL"
        ? "Concrete Testing"
        : "Material Testing";

    try {
      const res: any = await saveQuotationTemplateAction({
        name: templateName.trim(),
        category: categoryName,
        is_default: false,
        clauses: activeClauses,
      });

      if (res.success && res.data) {
        const newTemplate = res.data;
        setTemplates((prev) => [newTemplate, ...prev.filter((t) => t.id !== newTemplate.id)]);
        setSelectedTemplateId(newTemplate.id);
        toast({
          title: "Template Saved",
          description: `T&C Template "${newTemplate.name}" has been saved and selected!`,
        });
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast({
          title: "Save Failed",
          description: res.error || "Could not save template.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  // Reset form handler
  const handleReset = () => {
    if (!confirm("Are you sure you want to reset all form fields?")) return;
    if (revisingQuotation) {
      setForm({
        client_id: revisingQuotation.client_id || "",
        project_id: revisingQuotation.project_id || "",
        discount_amount: revisingQuotation.discount_amount ? String(revisingQuotation.discount_amount) : "",
        gst_rate: revisingQuotation.gst_rate !== undefined ? String(revisingQuotation.gst_rate) : "18",
        valid_until: revisingQuotation.valid_until || defaultValidDate,
        remarks: revisingQuotation.remarks || "",
        category: (revisingQuotation.category === "Non-NABL" ? "Non-NABL" : "NABL") as "NABL" | "Non-NABL",
        department: (revisingQuotation.department?.toLowerCase().includes("environ") ? "Environment" : "Construction") as "Construction" | "Environment",
        revision_reason: `Revised line items and commercial terms as requested for V${nextVersionNumber}`,
      });
      if (Array.isArray(revisingQuotation.items) && revisingQuotation.items.length > 0) {
        setItems(revisingQuotation.items.map((it: any) => ({
          description: it.description || "",
          qty: it.qty || 1,
          rate: it.rate || 0,
        })));
      }
      if (Array.isArray(revisingQuotation.clauses) && revisingQuotation.clauses.length > 0) {
        setActiveClauses(JSON.parse(JSON.stringify(revisingQuotation.clauses)));
      }
    } else {
      setForm({
        client_id: "",
        project_id: "",
        valid_until: defaultValidDate,
        discount_amount: "",
        gst_rate: "18",
        remarks: "",
        category: "NABL",
        department: "Construction",
        revision_reason: "",
      });
      setItems([{ description: "Concrete Cube Compressive Strength Testing (IS 516)", qty: 3, rate: 450 }]);
      if (defaultTemplate?.clauses) {
        setActiveClauses(JSON.parse(JSON.stringify(defaultTemplate.clauses)));
      }
    }
    setErrorMsg(null);
  };

  // Submit quotation handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    let effectiveClientId = form.client_id;
    let effectiveProjectId = form.project_id || null;

    if (clientMode === "new") {
      const clientName = newClientData.name.trim();
      if (!clientName) {
        setErrorMsg("Please enter the Client / Organization Name.");
        toast({
          title: "Client Name Required",
          description: "Please enter the Client / Organization Name for the new client.",
          variant: "error",
        });
        return;
      }

      setIsSubmitting(true);
      try {
        const clientRes = await createClientAction({
          name: clientName,
          company_name: clientName,
          contact_person: newClientData.contact_person.trim() || undefined,
          mobile: newClientData.mobile.trim() || undefined,
          email: newClientData.email.trim() || undefined,
          gst_no: newClientData.gst_no.trim() || undefined,
          address: newClientData.address.trim() || undefined,
          site_name: newClientData.site_name.trim() || undefined,
          project_name: newClientData.site_name.trim() || undefined,
        });

        if (!clientRes.success || !clientRes.data) {
          setErrorMsg(clientRes.error || "Failed to create new client.");
          setIsSubmitting(false);
          return;
        }

        const createdClient = clientRes.data.client;
        const createdProject = clientRes.data.project;

        setClientsList((prev) => [createdClient, ...prev.filter((c) => c.id !== createdClient.id)]);
        effectiveClientId = createdClient.id;

        if (createdProject) {
          setProjectsList((prev) => [createdProject, ...prev.filter((p) => p.id !== createdProject.id)]);
          effectiveProjectId = createdProject.id;
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to create client.");
        setIsSubmitting(false);
        return;
      }
    } else {
      if (!effectiveClientId) {
        setErrorMsg("Please select a client for this quotation.");
        toast({
          title: "Client Required",
          description: "Please select a client from the dropdown or switch to 'Create New Client'.",
          variant: "error",
        });
        return;
      }
    }

    if (items.some((it) => !it.description.trim())) {
      setErrorMsg("All line items must have a clear description.");
      toast({
        title: "Invalid Line Items",
        description: "Please fill in descriptions for all line items.",
        variant: "error",
      });
      setIsSubmitting(false);
      return;
    }

    if (items.some((it) => Number(it.qty) <= 0)) {
      setErrorMsg("Line item quantities must be greater than 0.");
      toast({
        title: "Invalid Quantity",
        description: "Quantity must be at least 1 for all items.",
        variant: "error",
      });
      setIsSubmitting(false);
      return;
    }

    const compiledTerms = activeClauses
      .map((c) => `${(c.title || "").toUpperCase()}:\n${c.content || ""}`)
      .join("\n\n");

    setIsSubmitting(true);
    try {
      if (revisingQuotation) {
        const revReason =
          form.revision_reason.trim() ||
          `Revised line items and commercial terms as requested for Version ${nextVersionNumber}`;

        const res = await reviseQuotationAction(revisingQuotation.id, {
          client_id: effectiveClientId,
          project_id: effectiveProjectId,
          valid_until: form.valid_until || null,
          remarks: form.remarks || null,
          category: form.category || null,
          department: form.department || null,
          items,
          discount_amount: discount,
          gst_rate: gstRate,
          terms: compiledTerms,
          clauses: activeClauses,
          revision_reason: revReason,
          status: "draft",
        });

        if (res.success) {
          toast({
            title: "Revision Issued",
            description: `Quotation ${revisingQuotation.quotation_no} revised to Version ${nextVersionNumber} successfully!`,
          });
          router.push(returnUrl);
          router.refresh();
        } else {
          setErrorMsg(res.error || "Failed to revise quotation.");
          toast({
            title: "Revision Failed",
            description: res.error || "Failed to revise quotation.",
            variant: "error",
          });
        }
      } else {
        const res = await createQuotationWithItemsAction({
          client_id: effectiveClientId,
          project_id: effectiveProjectId,
          valid_until: form.valid_until || null,
          remarks: form.remarks || null,
          category: form.category || null,
          department: form.department || null,
          items,
          discount_amount: discount,
          gst_rate: gstRate,
          terms: compiledTerms,
          clauses: activeClauses,
        });

        if (res.success) {
          toast({
            title: "Quotation Created",
            description: `Quotation ${(res as any).data?.quotation_no || ""} drafted successfully!`,
          });
          router.push(returnUrl);
          router.refresh();
        } else {
          setErrorMsg(res.error || "Failed to create quotation.");
          toast({
            title: "Creation Failed",
            description: res.error || "Failed to create quotation.",
            variant: "error",
          });
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred while saving quotation.");
      toast({
        title: "Error",
        description: err?.message || "An unexpected error occurred.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls =
    "w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all";

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Test Master Datalist for fast auto-complete (strictly filtered by active Category & Department) */}
      <datalist id="test-masters-list">
        {filteredTestMasters.map((tm: any) => (
          <option key={tm.id} value={formatTestCatalogLabel(tm)}>
            {tm.material_product ? `[${tm.material_product}] ` : ""}
            {tm.component_parameter || tm.specific_test || tm.particulars}
          </option>
        ))}
      </datalist>

      {/* Top Navigation & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push(returnUrl)}
            className="h-10 px-3.5 rounded-xl border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Quotations</span>
          </Button>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isRevising
                  ? "bg-amber-50 border-amber-200 text-amber-600"
                  : "bg-blue-50 border-blue-200 text-blue-600"
              }`}
            >
              {isRevising ? <RefreshCw className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 leading-tight">
                  {isRevising
                    ? `Revise Quotation (${revisingQuotation.quotation_no} V${nextVersionNumber})`
                    : "Create New Quotation"}
                </h1>
                {isRevising && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    Draft V{nextVersionNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Testing & Engineering Services · Detailed commercial proposal & legal terms
              </p>
            </div>
          </div>
        </div>

        {/* Header Right Action Buttons */}
        <div className="flex items-center gap-2.5 self-end sm:self-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={isSubmitting}
            className="h-9 px-3 text-xs text-slate-500 hover:text-slate-800 rounded-xl gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push(returnUrl)}
            disabled={isSubmitting}
            className="h-9 px-4 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border-slate-200 cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={(e) => handleSubmit(e as any)}
            disabled={isSubmitting || items.length === 0}
            className={`h-9 px-5 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer flex items-center gap-2 ${
              isRevising
                ? "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20"
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : isRevising ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Save & Issue V{nextVersionNumber}</span>
              </>
            ) : (
              <>
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Create Quotation</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-xs text-rose-800 font-medium shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="flex-1">{errorMsg}</div>
        </div>
      )}

      {/* Prominent Revision Banner */}
      {isRevising && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200 text-xs text-amber-950 space-y-3 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-amber-500 text-white">
                <RefreshCw className="w-4 h-4 animate-spin" />
              </span>
              <div>
                <span className="font-bold text-sm text-amber-900">
                  Revising Quotation {revisingQuotation.quotation_no}
                </span>
                <span className="ml-2 text-xs font-semibold text-amber-700">
                  (Currently Version {revisingQuotation.version_number || 1} &rarr; Creating Version {nextVersionNumber})
                </span>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-200/50 px-2.5 py-1 rounded-lg">
              Status: {(revisingQuotation.status || "draft").toUpperCase()}
            </span>
          </div>

          {revisingQuotation.rework_notes && (
            <div className="text-xs text-amber-900 bg-amber-100/70 p-3 rounded-xl border border-amber-300/60 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Technical Rework Instructions:</strong>
                <p className="mt-0.5 leading-relaxed">{revisingQuotation.rework_notes}</p>
              </div>
            </div>
          )}

          {revisingQuotation.rejection_reason && (
            <div className="text-xs text-rose-900 bg-rose-100/80 p-3 rounded-xl border border-rose-300/60 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Client Rejection / Feedback Note:</strong>
                <p className="mt-0.5 leading-relaxed">{revisingQuotation.rejection_reason}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-amber-950 mb-1">
              Revision Reason / Modification Summary
            </label>
            <input
              type="text"
              value={form.revision_reason}
              onChange={(e) => setForm({ ...form, revision_reason: e.target.value })}
              placeholder="e.g. Revised line items, updated quantities and commercial rates per client request"
              className="w-full text-xs border border-amber-300 rounded-xl px-3.5 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
        </div>
      )}

      {/* Main Responsive Form Layout */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Client & Project Reference (Full Width) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">1. Client & Project Details</h2>
                  <p className="text-xs text-slate-500">
                    Select an existing corporate client or enter details for a new client.
                  </p>
                </div>
              </div>

              {/* Segmented Mode Selector */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setClientMode("existing")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    clientMode === "existing"
                      ? "bg-white text-blue-700 shadow-xs border border-slate-200/60"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Choose Existing</span>
                </button>
                <button
                  type="button"
                  onClick={() => setClientMode("new")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    clientMode === "new"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Client</span>
                </button>
              </div>
            </div>

            {/* Mode 1: Existing Client Dropdown */}
            {clientMode === "existing" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-blue-600" /> Client Name <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setClientMode("new")}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> + New Client Form
                      </button>
                    </div>
                    <select
                      required={clientMode === "existing"}
                      className={inputCls}
                      value={form.client_id}
                      onChange={(e) => {
                        if (e.target.value === "__NEW_CLIENT__") {
                          setClientMode("new");
                        } else {
                          setForm({ ...form, client_id: e.target.value });
                        }
                      }}
                    >
                      <option value="">-- Choose a Client --</option>
                      <option value="__NEW_CLIENT__" className="font-semibold text-blue-600 bg-blue-50/60">
                        ➕ + Create New Client...
                      </option>
                      {clientsList.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.contact_person ? `(${c.contact_person})` : ""} {c.gst_no ? `• GST: ${c.gst_no}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-blue-600" /> Project / Site Name
                    </label>
                    <select
                      className={inputCls}
                      value={form.project_id}
                      onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                    >
                      <option value="">General Project / Site</option>
                      {projectsList.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Selected client info card */}
                {selectedClientInfo && (
                  <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-700">
                    <span className="font-bold text-blue-900 flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-blue-600" /> {selectedClientInfo.name}
                    </span>
                    {selectedClientInfo.contact_person && (
                      <span className="flex items-center gap-1 text-slate-600">
                        <User className="w-3 h-3 text-slate-400" /> {selectedClientInfo.contact_person}
                      </span>
                    )}
                    {selectedClientInfo.mobile && (
                      <span className="flex items-center gap-1 text-slate-600">
                        <Phone className="w-3 h-3 text-slate-400" /> {selectedClientInfo.mobile}
                      </span>
                    )}
                    {selectedClientInfo.email && (
                      <span className="flex items-center gap-1 text-slate-600">
                        <Mail className="w-3 h-3 text-slate-400" /> {selectedClientInfo.email}
                      </span>
                    )}
                    {selectedClientInfo.gst_no && (
                      <span className="flex items-center gap-1 text-slate-600 font-mono">
                        <FileSpreadsheet className="w-3 h-3 text-slate-400" /> GST: {selectedClientInfo.gst_no}
                      </span>
                    )}
                    {selectedClientInfo.address && (
                      <span className="flex items-center gap-1 text-slate-600 sm:col-span-full">
                        <MapPin className="w-3 h-3 text-slate-400" /> {selectedClientInfo.address}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Mode 2: Create New Client Inline Form */
              <div className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-blue-100/80">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    New Client Registration (Will be saved with this Quotation)
                  </span>
                  <button
                    type="button"
                    onClick={() => setClientMode("existing")}
                    className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Switch back to Existing Client
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-blue-600" />
                      Client / Organization Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required={clientMode === "new"}
                      className={inputCls}
                      placeholder="e.g. Larsen & Toubro Construction Ltd."
                      value={newClientData.name}
                      onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      Contact Person
                    </label>
                    <input
                      type="text"
                      className={inputCls}
                      placeholder="e.g. Rajesh Sharma"
                      value={newClientData.contact_person}
                      onChange={(e) => setNewClientData({ ...newClientData, contact_person: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      Phone / Mobile
                    </label>
                    <input
                      type="tel"
                      className={inputCls}
                      placeholder="e.g. +91 98765 43210"
                      value={newClientData.mobile}
                      onChange={(e) => setNewClientData({ ...newClientData, mobile: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      className={inputCls}
                      placeholder="e.g. accounts@client.com"
                      value={newClientData.email}
                      onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                      GST Number (GSTIN)
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      className={inputCls}
                      placeholder="e.g. 27AAAAA0000A1Z5"
                      value={newClientData.gst_no}
                      onChange={(e) => setNewClientData({ ...newClientData, gst_no: e.target.value.toUpperCase() })}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                      Project / Construction Site Name
                    </label>
                    <input
                      type="text"
                      className={inputCls}
                      placeholder="e.g. Metro Rail Pier Construction - Site A"
                      value={newClientData.site_name}
                      onChange={(e) => setNewClientData({ ...newClientData, site_name: e.target.value })}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      Office / Billing Address
                    </label>
                    <textarea
                      rows={2}
                      className={`${inputCls} resize-none`}
                      placeholder="e.g. Plot No. 42, Sector 18, Phase 2, Industrial Area..."
                      value={newClientData.address}
                      onChange={(e) => setNewClientData({ ...newClientData, address: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Testing Category & Department Section */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-500"></span> Testing Category <span className="text-rose-500">*</span>
                    </label>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        form.category === "NABL"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {form.category === "NABL" ? "NABL Accredited" : "Non-NABL Standard"}
                    </span>
                  </div>
                  <select
                    className={inputCls}
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                  >
                    {QUOTATION_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat === "NABL" ? "NABL (Accredited Testing)" : "Non-NABL (Standard Testing)"}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">Filters laboratory test parameters by NABL accreditation status</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span> Department / Laboratory Section <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {form.department} Lab
                    </span>
                  </div>
                  <select
                    className={inputCls}
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value as any })}
                  >
                    {QUOTATION_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept === "Construction" ? "Construction (Civil & Materials Testing)" : "Environment (Environmental & Pollution Lab)"}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">Filters laboratory tests by discipline & responsible testing division</p>
                </div>
              </div>

              {/* Informative live feedback card */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-700">Catalog Filter Applied:</span>
                  <span className="font-bold text-slate-900">
                    {form.category} Scope • {form.department} Department
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
                    {filteredTestMasters.length} tests ready for selection
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSelectTestModalOpen(true)}
                  className="font-bold text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1 cursor-pointer hover:underline"
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>Browse Tests</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Line Items & Testing Parameters */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">2. Line Items & Testing Parameters</h2>
                  <p className="text-xs text-slate-500">
                    Define the scope of laboratory materials testing, geotechnical investigations, or inspection fees.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsSelectTestModalOpen(true)}
                  className="h-8 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl gap-1.5 cursor-pointer shadow-xs"
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>Select from Test Catalog</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="h-8 px-3 text-xs font-bold text-slate-700 bg-white border-slate-200 hover:bg-slate-50 rounded-xl gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </Button>
              </div>
            </div>

            {/* Quick Test Picker Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200/80">
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <FlaskConical className="w-3.5 h-3.5 text-blue-600" /> Catalog Scope:
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    form.category === "NABL"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {form.category}
                </span>
                <span className="text-slate-300">•</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {form.department} Lab
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  ({filteredTestMasters.length} tests available)
                </span>
              </div>

              {/* Quick Dropdown Picker - uses remaining width */}
              <div className="flex-1 min-w-[260px] flex items-center">
                <select
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-blue-500 outline-none cursor-pointer shadow-2xs"
                  value=""
                  onChange={(e) => {
                    handleQuickAddTest(e.target.value);
                    e.target.value = "";
                  }}
                >
                  <option value="">⚡ + Quick Pick a Test from {form.category} • {form.department}...</option>
                  {filteredTestMasters.map((tm: any) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.component_parameter || tm.specific_test || tm.particulars}
                      {tm.test_method ? ` (${tm.test_method})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              <div className="grid grid-cols-12 gap-3 bg-slate-50/80 p-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-6">Description of Test / Service</div>
                <div className="col-span-1 text-center">Qty</div>
                <div className="col-span-2 text-right">Rate (₹)</div>
                <div className="col-span-2 text-right">Amount (₹)</div>
              </div>

              {items.map((it, i) => {
                const rowAmt = (Number(it.qty) || 0) * (Number(it.rate) || 0);
                return (
                  <div
                    key={i}
                    className="grid grid-cols-12 gap-3 p-3 items-center bg-white hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="col-span-1 text-center text-xs font-bold text-slate-400">
                      {i + 1}
                    </div>

                    <div className="col-span-6 flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          required
                          list="test-masters-list"
                          className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          placeholder={`Type test name or choose from ${form.category} • ${form.department}...`}
                          value={it.description}
                          onChange={(e) => updateItem(i, "description", e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsSelectTestModalOpen(true)}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 border border-slate-200 transition-colors cursor-pointer shrink-0"
                        title="Browse & Select from Test Catalog"
                      >
                        <FlaskConical className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="col-span-1">
                      <input
                        type="number"
                        min="1"
                        className="w-full text-xs text-center border border-slate-200 rounded-lg py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        value={it.qty}
                        onChange={(e) => updateItem(i, "qty", Number(e.target.value))}
                      />
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        className="w-full text-xs text-right border border-slate-200 rounded-lg py-2 px-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="0.00"
                        value={it.rate}
                        onChange={(e) => updateItem(i, "rate", Number(e.target.value))}
                      />
                    </div>

                    <div className="col-span-2 flex items-center justify-end gap-2 text-xs font-bold text-slate-800">
                      <span className="nums whitespace-nowrap">{fmt(rowAmt)}</span>
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        disabled={items.length <= 1}
                        className="text-slate-300 hover:text-rose-600 disabled:opacity-20 cursor-pointer p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Remove Line Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={addItem}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer py-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Another Test Parameter
              </button>

              <div className="text-xs font-semibold text-slate-600">
                Items Subtotal: <strong className="text-slate-900 ml-1">{fmt(subtotal)}</strong>
              </div>
            </div>
          </div>

        {/* Bottom 2-Column Responsive Layout for Terms & Commercial Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (8 cols): Standard Quotation Terms & Conditions */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            {/* Card 3: Legal Terms & Conditions Specification */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Scroll className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">3. Legal Terms & Conditions Specification</h2>
                  <p className="text-xs text-slate-500">
                    Standardize testing standards, payment schedule, sample retention, and accreditation disclaimers.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomClause}
                  className="h-8 px-3 text-xs font-bold text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 rounded-xl gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Clause</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSaveAsTemplate}
                  disabled={activeClauses.length === 0}
                  className="h-8 px-3 text-xs font-bold text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 rounded-xl gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save as Template</span>
                </Button>
              </div>
            </div>

            {/* Template Selector Bar */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Select Pre-authorized T&C Template
                  </label>
                  <button
                    type="button"
                    onClick={refreshTemplatesList}
                    disabled={isRefreshingTemplates}
                    title="Reload latest T&C templates"
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={cn("w-3 h-3", isRefreshingTemplates && "animate-spin")} />
                    <span>{isRefreshingTemplates ? "Refreshing..." : "Refresh List"}</span>
                  </button>
                </div>
                <select
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-white outline-none focus:border-blue-500"
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

              <div className="flex items-center gap-2 pt-1 sm:pt-4">
                <Button
                  type="button"
                  variant="custom"
                  size="sm"
                  onClick={() => handleLoadTemplate(false)}
                  disabled={!selectedTemplateId}
                  className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  Load Template
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleLoadTemplate(true)}
                  disabled={!selectedTemplateId}
                  className="h-9 px-4 text-xs font-bold bg-white border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl disabled:opacity-40 cursor-pointer"
                >
                  Append Clauses
                </Button>
              </div>
            </div>

            {/* Active Clauses Cards List */}
            <div className="space-y-3 pt-2">
              {activeClauses.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs space-y-2">
                  <Scroll className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-600">No legal clauses active</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Select a template above or click &quot;+ Add Clause&quot; to specify custom contractual terms.
                  </p>
                </div>
              ) : (
                activeClauses.map((clause, idx) => (
                  <div
                    key={clause.id || idx}
                    className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden transition-all hover:border-slate-300"
                  >
                    <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-200">
                      <div className="flex items-center gap-2.5 flex-1">
                        <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          value={clause.title}
                          onChange={(e) => updateClause(idx, "title", e.target.value)}
                          placeholder="Clause Heading (e.g. Testing Standards & Scope, Payment Terms)"
                          className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:text-blue-700"
                        />
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => moveClause(idx, "up")}
                          disabled={idx === 0}
                          title="Move Clause Up"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-200/60 disabled:opacity-30 cursor-pointer transition-colors"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveClause(idx, "down")}
                          disabled={idx === activeClauses.length - 1}
                          title="Move Clause Down"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-200/60 disabled:opacity-30 cursor-pointer transition-colors"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeClause(idx)}
                          title="Delete Clause"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="p-3.5 relative">
                      <textarea
                        value={clause.content}
                        onChange={(e) => updateClause(idx, "content", e.target.value)}
                        placeholder="Detailed contractual clause terms, technical specifications, or limitation of liability..."
                        rows={3}
                        maxLength={800}
                        className="w-full text-xs text-slate-700 bg-transparent border border-slate-200 rounded-xl p-3 pb-6 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y leading-relaxed"
                      />
                      <div className="absolute bottom-5 right-5 text-[10px] text-slate-400 pointer-events-none">
                        {clause.content?.length || 0}/800
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column (4-5 cols): Financial Calculations, Remarks, Sticky Submit */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6 sticky top-6">
          {/* Card 4: Commercial Financial Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Commercial Summary</h2>
                <p className="text-xs text-slate-500">Taxes, discounts, and total quotation valuation.</p>
              </div>
            </div>

            {/* Discount & GST Controls */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-blue-600" /> Discount Amount (₹)
                  </span>
                  {discount > 0 && <span className="text-[11px] text-emerald-600 font-bold">-{fmt(discount)}</span>}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputCls}
                  placeholder="0.00"
                  value={form.discount_amount}
                  onChange={(e) => setForm({ ...form, discount_amount: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <BadgePercent className="w-3.5 h-3.5 text-blue-600" /> GST Tax Rate
                  </span>
                  <span className="text-[11px] font-bold text-slate-600">₹{gst.toFixed(2)}</span>
                </label>
                <select
                  className={inputCls}
                  value={form.gst_rate}
                  onChange={(e) => setForm({ ...form, gst_rate: e.target.value })}
                >
                  <option value="18">18% (Standard Testing GST)</option>
                  <option value="12">12% GST</option>
                  <option value="5">5% GST</option>
                  <option value="0">0% (GST Exempt / SEZ)</option>
                </select>
              </div>
            </div>

            {/* Breakdown Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Items Subtotal:</span>
                <span className="font-semibold text-slate-800 nums">{fmt(subtotal)}</span>
              </div>

              {discount > 0 && (
                <div className="flex items-center justify-between text-emerald-700 font-medium">
                  <span>Special Discount:</span>
                  <span className="nums">-{fmt(discount)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-slate-600">
                <span>Taxable Value:</span>
                <span className="font-semibold text-slate-800 nums">{fmt(taxable)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>GST ({gstRate}%):</span>
                <span className="font-semibold text-slate-800 nums">{fmt(gst)}</span>
              </div>

              <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Total Quotation
                  </span>
                  <span className="text-xl font-bold text-blue-700 nums">{fmt(total)}</span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                  {items.length} item{items.length !== 1 ? "s" : ""}
                </span>
              </div>

              {amountInWords && (
                <div className="pt-2 text-[11px] text-slate-500 italic leading-snug border-t border-slate-200/60">
                  {amountInWords}
                </div>
              )}
            </div>

            {/* Validity & Remarks */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" /> Quotation Validity Date
                </label>
                <input
                  type="date"
                  className={inputCls}
                  value={form.valid_until}
                  onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Internal Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  className={`${inputCls} resize-none`}
                  placeholder="Internal remarks for laboratory accounts and dispatch..."
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                />
              </div>
            </div>

            {/* Submit Action Block */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <Button
                type="submit"
                disabled={isSubmitting || items.length === 0}
                className={`w-full h-11 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  isRevising
                    ? "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Quotation...</span>
                  </>
                ) : isRevising ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Save & Issue Revision V{nextVersionNumber}</span>
                  </>
                ) : (
                  <>
                    <FileCheck2 className="w-4 h-4" />
                    <span>Create Quotation with Authorized T&C</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(returnUrl)}
                disabled={isSubmitting}
                className="w-full h-9 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border-slate-200 cursor-pointer"
              >
                Cancel & Return
              </Button>
            </div>
          </div>
        </div>
        </div>
      </form>

      <QuickCreateClientModal
        isOpen={isCreateClientModalOpen}
        onClose={() => setIsCreateClientModalOpen(false)}
        onSuccess={handleClientCreated}
      />

      <SelectTestModal
        isOpen={isSelectTestModalOpen}
        onClose={() => setIsSelectTestModalOpen(false)}
        category={form.category as any}
        department={form.department as any}
        onCategoryChange={(cat) => setForm((prev) => ({ ...prev, category: cat }))}
        onDepartmentChange={(dept) => setForm((prev) => ({ ...prev, department: dept }))}
        allTests={testMasters}
        onSelectTests={handleSelectTestsFromCatalog}
      />
    </div>
  );
}
