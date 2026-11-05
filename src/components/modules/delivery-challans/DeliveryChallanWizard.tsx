"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { 
  createDeliveryChallan, 
  getNextChallanNumber 
} from "@/actions/delivery-challan.actions";
import { 
  DeliveryChallanItem, 
  StaffMember 
} from "@/types/delivery-challan";
import { PrintableDeliveryChallan } from "./PrintableDeliveryChallan";
import { EmployeeSearchInput } from "./EmployeeSearchInput";
import { ClientSearchInput, ClientItem } from "./ClientSearchInput";
import { 
  Building2, 
  User, 
  Calendar, 
  FileText, 
  Layers, 
  Plus, 
  Trash2, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Printer, 
  Truck, 
  Sparkles, 
  ShieldCheck, 
  PackageCheck,
  Check,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface DeliveryChallanWizardProps {
  initialChallanNo?: string;
  clients?: ClientItem[];
  staff?: StaffMember[];
  userProfile?: {
    first_name: string;
    last_name: string;
    designation?: string;
  };
  onSuccessRedirect?: string;
}

const COMMON_MATERIAL_PRESETS = [
  { name: "Concrete Cubes 150×150 mm (M25)", qty: "3 Nos" },
  { name: "Concrete Cubes 150×150 mm (M30)", qty: "3 Nos" },
  { name: "TMT Rebars (Steel Reinforcement)", qty: "3 Samples" },
  { name: "Coarse Aggregate 20 mm", qty: "50 Kg" },
  { name: "Coarse Aggregate 10 mm", qty: "50 Kg" },
  { name: "Fine Aggregate (M-Sand / River Sand)", qty: "50 Kg" },
  { name: "OPC / PPC Cement Bags", qty: "1 Bag (50 Kg)" },
  { name: "Soil Sample for Lab CBR/MDD", qty: "30 Kg" },
  { name: "Extracted Concrete Core", qty: "3 Nos" },
  { name: "Clay / Fly Ash Bricks", qty: "10 Nos" },
  { name: "Interlocking Paver Blocks", qty: "8 Nos" },
];

export function DeliveryChallanWizard({
  initialChallanNo = "",
  clients = [],
  staff = [],
  userProfile,
  onSuccessRedirect = "/delivery-challan",
}: DeliveryChallanWizardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [createdSuccess, setCreatedSuccess] = useState(false);

  // Form State
  const [challanNo, setChallanNo] = useState(initialChallanNo);
  const [challanDate, setChallanDate] = useState(todayStr);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  // Customer & Site Details
  const [customerName, setCustomerName] = useState("");
  const [projectSiteName, setProjectSiteName] = useState("");
  const [materialTakenBy, setMaterialTakenBy] = useState("");
  const [companyAgencyName, setCompanyAgencyName] = useState("");
  const [mobileNo, setMobileNo] = useState("");

  // Quick Employee Selector state for autofill
  const [quickEmployeeName, setQuickEmployeeName] = useState("");

  // Items
  const [items, setItems] = useState<DeliveryChallanItem[]>([
    { sr_no: 1, material_description: "", quantity: "", remarks: "" },
  ]);

  // Purpose
  const [purpose, setPurpose] = useState<string>("Customer Material Handover");
  const [purposeOther, setPurposeOther] = useState("");

  // Declaration & Authorization
  const [receiverName, setReceiverName] = useState("");
  const [receiverDate, setReceiverDate] = useState(todayStr);

  const defaultIssuer = userProfile?.first_name
    ? `${userProfile.first_name} ${userProfile.last_name || ""}`.trim()
    : "";
  const [issuedByName, setIssuedByName] = useState(defaultIssuer);
  const [issuedDate, setIssuedDate] = useState(todayStr);
  const [verifiedByName, setVerifiedByName] = useState("");

  // Fetch challan number if not passed initially
  useEffect(() => {
    if (!challanNo) {
      getNextChallanNumber().then((no) => {
        if (no) setChallanNo(no);
      }).catch(console.error);
    }
  }, [challanNo]);

  // Handle Client Selection with Auto-fill
  const handleClientSelect = (client: ClientItem | null) => {
    if (!client) {
      setSelectedClientId("");
      return;
    }
    setSelectedClientId(client.id);
    setCustomerName(client.name || client.company_name || "");
    const projectOrSite = [client.project_name, client.site_name].filter(Boolean).join(" - ");
    setProjectSiteName(projectOrSite);
    setCompanyAgencyName(client.company_name || client.agency_name || "");
    if (client.contact_person && !materialTakenBy) {
      setMaterialTakenBy(client.contact_person);
    }
    if (client.mobile && !mobileNo) {
      setMobileNo(client.mobile);
    }
  };

  // Handle Quick Employee autofill
  const handleQuickEmployeeSelect = (val: string, member?: StaffMember) => {
    setQuickEmployeeName(val);
    if (member) {
      const name = `${member.first_name || ""} ${member.last_name || ""}`.trim();
      setMaterialTakenBy(name);
      if (!receiverName) setReceiverName(name);
      if (member.phone_number && !mobileNo) setMobileNo(member.phone_number);
      if (member.department && !companyAgencyName) {
        setCompanyAgencyName(`ConstroTrait (${member.department})`);
      }
      toast({
        title: "Employee Selected",
        description: `Autofilled "${name}" as Material Handover Person.`,
      });
    }
  };

  // Add Item Row
  const handleAddItem = (preset?: { name: string; qty: string }) => {
    setItems((prev) => [
      ...prev,
      {
        sr_no: prev.length + 1,
        material_description: preset?.name || "",
        quantity: preset?.qty || "",
        remarks: "",
      },
    ]);
  };

  // Remove Item Row
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setItems([{ sr_no: 1, material_description: "", quantity: "", remarks: "" }]);
      return;
    }
    setItems((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, sr_no: i + 1 }))
    );
  };

  // Update Item Row
  const handleUpdateItem = (
    index: number,
    field: keyof DeliveryChallanItem,
    val: string
  ) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Validation Checks per Step
  const validateStep1 = () => {
    if (!challanNo.trim()) {
      toast({ title: "Validation Error", description: "Challan Number is required", variant: "destructive" });
      return false;
    }
    if (!challanDate) {
      toast({ title: "Validation Error", description: "Challan Date is required", variant: "destructive" });
      return false;
    }
    if (!customerName.trim()) {
      toast({ title: "Validation Error", description: "Customer / Client Name is required", variant: "destructive" });
      return false;
    }
    if (!materialTakenBy.trim()) {
      toast({ title: "Validation Error", description: "Material Taken By (Person's Name) is required", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const validItems = items.filter((it) => it.material_description.trim().length > 0);
    if (validItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please enter at least one material item description",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!issuedByName.trim()) {
      toast({ title: "Validation Error", description: "Issued By (Staff Name) is required", variant: "destructive" });
      return false;
    }
    if (!receiverName.trim()) {
      setReceiverName(materialTakenBy.trim());
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!validateStep2()) return;
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!validateStep3()) return;
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as any);
    }
  };

  // Submit and Save
  const handleSaveChallan = async () => {
    setLoading(true);
    try {
      const validItems = items.filter((it) => it.material_description.trim().length > 0);

      const res = await createDeliveryChallan({
        challan_no: challanNo.trim(),
        challan_date: challanDate,
        client_id: selectedClientId || null,
        customer_name: customerName.trim(),
        project_site_name: projectSiteName.trim() || null,
        material_taken_by: materialTakenBy.trim(),
        company_agency_name: companyAgencyName.trim() || null,
        mobile_no: mobileNo.trim() || null,
        purpose_of_handover: purpose,
        purpose_other: purpose === "Other" ? purposeOther.trim() : null,
        items: validItems,
        receiver_name: (receiverName || materialTakenBy).trim(),
        receiver_signature_date: receiverDate || null,
        issued_by_name: issuedByName.trim(),
        issued_by_signature_date: issuedDate || null,
        verified_by_name: verifiedByName.trim() || null,
      });

      if (res.success) {
        toast({
          title: "Delivery Voucher Created Successfully!",
          description: `Challan ${challanNo} recorded in database.`,
        });
        setCreatedSuccess(true);
        setTimeout(() => {
          router.push(onSuccessRedirect);
          router.refresh();
        }, 1500);
      } else {
        toast({
          title: "Failed to create delivery voucher",
          description: res.error,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create delivery voucher",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const previewData = {
    challan_no: challanNo,
    challan_date: challanDate,
    customer_name: customerName,
    project_site_name: projectSiteName,
    material_taken_by: materialTakenBy,
    company_agency_name: companyAgencyName,
    mobile_no: mobileNo,
    purpose_of_handover: purpose,
    purpose_other: purposeOther,
    items: items.filter((it) => it.material_description.trim().length > 0),
    receiver_name: receiverName || materialTakenBy,
    receiver_signature_date: receiverDate,
    issued_by_name: issuedByName,
    issued_by_signature_date: issuedDate,
    verified_by_name: verifiedByName,
  };

  const stepsList = [
    { num: 1, title: "Customer & Site", subtitle: "Handover Party & Address", icon: User },
    { num: 2, title: "Material Items", subtitle: "Samples & Quantities", icon: Layers },
    { num: 3, title: "Purpose & Signatures", subtitle: "Lab Authorization", icon: ShieldCheck },
    { num: 4, title: "Review & Generate", subtitle: "Live Printable Challan", icon: FileText },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/delivery-challan" className="hover:text-orange-600 transition-colors">
              Delivery Vouchers
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-800">New Material Handover</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <span>Material Handover / Delivery Voucher Wizard</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Step-by-step wizard to issue, authorize, and print official material delivery vouchers.
          </p>
        </div>

        <Link href="/delivery-challan">
          <Button variant="outline" size="sm" className="rounded-xl border-slate-200 text-slate-600 text-xs">
            Cancel & Back
          </Button>
        </Link>
      </div>

      {/* Step Indicators Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stepsList.map((s) => {
          const StepIcon = s.icon;
          const isCompleted = currentStep > s.num;
          const isCurrent = currentStep === s.num;

          return (
            <div
              key={s.num}
              onClick={() => {
                if (s.num < currentStep) {
                  setCurrentStep(s.num as any);
                }
              }}
              className={cn(
                "p-3 rounded-2xl border transition-all duration-200 flex items-center gap-3",
                isCurrent
                  ? "bg-orange-50/80 border-orange-300 ring-2 ring-orange-400/20 shadow-sm"
                  : isCompleted
                  ? "bg-white border-emerald-200 cursor-pointer hover:bg-slate-50"
                  : "bg-white border-slate-200/80 opacity-60"
              )}
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors",
                  isCurrent
                    ? "bg-orange-600 text-white shadow-md shadow-orange-500/30"
                    : isCompleted
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 text-slate-500"
                )}
              >
                {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : <StepIcon className="w-4 h-4" />}
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Step {s.num}
                </p>
                <p
                  className={cn(
                    "text-xs font-bold truncate",
                    isCurrent ? "text-orange-950" : isCompleted ? "text-slate-800" : "text-slate-500"
                  )}
                >
                  {s.title}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Wizard Form Container */}
      <Card className="rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden bg-white">
        <CardContent className="p-6 sm:p-8">
          {/* STEP 1: Customer & Site Details */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Quick Search & Autofill Panel */}
              <div className="bg-gradient-to-r from-orange-50/60 via-amber-50/40 to-slate-50 border border-orange-100/80 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-orange-900 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-orange-600" />
                  <span>Quick Search & Autofill Options</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Client Search with Suggestions */}
                  <ClientSearchInput
                    clients={clients}
                    selectedClientId={selectedClientId}
                    onSelectClient={handleClientSelect}
                  />

                  {/* Employee Search with Suggestions for Autofill */}
                  <div>
                    <EmployeeSearchInput
                      label="Autofill from Employee"
                      placeholder="Search employee name with suggestions..."
                      value={quickEmployeeName}
                      staff={staff}
                      onChange={handleQuickEmployeeSelect}
                      helperText="Select staff member to autofill 'Material Taken By' and phone"
                    />
                  </div>
                </div>
              </div>

              {/* Challan Meta */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Challan No. <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={challanNo}
                    onChange={(e) => setChallanNo(e.target.value)}
                    placeholder="e.g. DC-2026-0001"
                    required
                    className="h-10 rounded-xl text-xs font-bold border-slate-200 focus:border-orange-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Auto-generated sequence, editable if required</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Challan Date <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={challanDate}
                    onChange={(e) => {
                      setChallanDate(e.target.value);
                      setReceiverDate(e.target.value);
                      setIssuedDate(e.target.value);
                    }}
                    required
                    className="h-10 rounded-xl text-xs font-medium border-slate-200 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Customer & Site Form Fields */}
              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-orange-600" />
                  <span>Customer & Handover Party Information</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Customer / Client Name <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Larsen & Toubro / ABC Developers"
                      required
                      className="h-10 rounded-xl text-xs font-medium border-slate-200 focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Project / Site Name
                    </label>
                    <Input
                      type="text"
                      value={projectSiteName}
                      onChange={(e) => setProjectSiteName(e.target.value)}
                      placeholder="e.g. Highway Bridge Section 4 / Site B"
                      className="h-10 rounded-xl text-xs font-medium border-slate-200 focus:border-orange-500"
                    />
                  </div>

                  <div>
                    {/* Material Taken By with Live Employee Search Suggestions */}
                    <EmployeeSearchInput
                      label="Material Taken By (Person's Name)"
                      placeholder="Type person's name or search employee..."
                      required={true}
                      value={materialTakenBy}
                      staff={staff}
                      onChange={(val, member) => {
                        setMaterialTakenBy(val);
                        if (!receiverName) setReceiverName(val);
                        if (member?.phone_number && !mobileNo) {
                          setMobileNo(member.phone_number);
                        }
                      }}
                      helperText="Can be an employee from the lab or external site client/driver"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Company / Agency Name
                    </label>
                    <Input
                      type="text"
                      value={companyAgencyName}
                      onChange={(e) => setCompanyAgencyName(e.target.value)}
                      placeholder="e.g. ABC Infra Projects Pvt Ltd"
                      className="h-10 rounded-xl text-xs font-medium border-slate-200 focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mobile Number
                    </label>
                    <Input
                      type="tel"
                      value={mobileNo}
                      onChange={(e) => setMobileNo(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="h-10 rounded-xl text-xs font-medium border-slate-200 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Material Items */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Presets Bar */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                    <span>Quick Add Common Lab Materials</span>
                  </span>
                  <span className="text-[11px] text-slate-400">Click any item to add row</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {COMMON_MATERIAL_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleAddItem(preset)}
                      className="text-[11px] font-medium bg-white hover:bg-orange-50 hover:text-orange-700 border border-slate-200 hover:border-orange-300 rounded-lg px-2.5 py-1 text-slate-700 transition-all flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3 text-orange-500" />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-orange-600" />
                    <span>Material Line Items ({items.length})</span>
                  </h3>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAddItem()}
                    className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs h-8 gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Blank Row</span>
                  </Button>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-3 w-12 text-center">Sr.</th>
                        <th className="py-3 px-3">
                          Material Description <span className="text-rose-500">*</span>
                        </th>
                        <th className="py-3 px-3 w-36">Quantity</th>
                        <th className="py-3 px-3">Sample ID / Identification / Remarks</th>
                        <th className="py-3 px-2 w-12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 text-center font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-2">
                            <Input
                              type="text"
                              value={item.material_description}
                              onChange={(e) => handleUpdateItem(idx, "material_description", e.target.value)}
                              placeholder="e.g. Concrete Cubes 150x150 mm (M25)"
                              required
                              className="h-9 text-xs rounded-xl border-slate-200 focus:border-orange-500"
                            />
                          </td>
                          <td className="py-2.5 px-2">
                            <Input
                              type="text"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(idx, "quantity", e.target.value)}
                              placeholder="e.g. 3 Nos / 50 Kg"
                              className="h-9 text-xs rounded-xl border-slate-200 focus:border-orange-500"
                            />
                          </td>
                          <td className="py-2.5 px-2">
                            <Input
                              type="text"
                              value={item.remarks}
                              onChange={(e) => handleUpdateItem(idx, "remarks", e.target.value)}
                              placeholder="Sample code, casting date, mark, etc."
                              className="h-9 text-xs rounded-xl border-slate-200 focus:border-orange-500"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                              title="Delete row"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Purpose & Lab Authorization */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Purpose Selection */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-orange-600" />
                  <span>Purpose of Material Handover</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: "Customer Material Handover", desc: "Returning tested/untested samples or materials to customer" },
                    { id: "Material Taken for Testing", desc: "Staff collected materials from customer site to lab for testing" },
                    { id: "Material Collected from Lab", desc: "Third-party or external party collecting items from laboratory" },
                    { id: "Other", desc: "Specify other custom purpose for material handover" },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={cn(
                        "p-4 rounded-2xl border text-xs cursor-pointer transition-all flex items-start gap-3",
                        purpose === opt.id
                          ? "bg-orange-50/80 border-orange-300 text-orange-950 shadow-sm ring-1 ring-orange-300"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <input
                        type="radio"
                        name="purpose"
                        value={opt.id}
                        checked={purpose === opt.id}
                        onChange={() => setPurpose(opt.id)}
                        className="accent-orange-600 w-4 h-4 mt-0.5"
                      />
                      <div>
                        <p className="font-bold text-slate-900">{opt.id}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {purpose === "Other" && (
                  <div className="mt-2">
                    <Input
                      type="text"
                      value={purposeOther}
                      onChange={(e) => setPurposeOther(e.target.value)}
                      placeholder="Specify custom purpose of handover..."
                      className="h-10 rounded-xl text-xs font-medium border-slate-200 focus:border-orange-500"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Signatures & Authorizations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                {/* 3. Receiver */}
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-orange-600" />
                    <span>3. Declaration by Receiver</span>
                  </h4>

                  <EmployeeSearchInput
                    label="Receiver's Name"
                    placeholder="Search employee or type receiver name..."
                    required={true}
                    value={receiverName}
                    staff={staff}
                    onChange={(val) => setReceiverName(val)}
                    helperText="Name of person receiving the material (defaults to Material Taken By)"
                  />

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Receiver Signature Date
                    </label>
                    <Input
                      type="date"
                      value={receiverDate}
                      onChange={(e) => setReceiverDate(e.target.value)}
                      className="h-10 rounded-xl text-xs font-medium border-slate-200 focus:border-orange-500 bg-white"
                    />
                  </div>
                </div>

                {/* 4. Authorized by Lab */}
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-orange-600" />
                    <span>4. Authorized by Lab</span>
                  </h4>

                  <EmployeeSearchInput
                    label="Issued By (Staff Name)"
                    placeholder="Search employee name with suggestions..."
                    required={true}
                    value={issuedByName}
                    staff={staff}
                    onChange={(val) => setIssuedByName(val)}
                    helperText="Lab staff member issuing the delivery voucher"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Issue Date
                      </label>
                      <Input
                        type="date"
                        value={issuedDate}
                        onChange={(e) => setIssuedDate(e.target.value)}
                        className="h-10 rounded-xl text-xs font-medium border-slate-200 focus:border-orange-500 bg-white"
                      />
                    </div>

                    <div>
                      <EmployeeSearchInput
                        label="Verified By"
                        placeholder="Search manager name..."
                        value={verifiedByName}
                        staff={staff}
                        onChange={(val) => setVerifiedByName(val)}
                        helperText="Quality Manager / BM"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Review & Live Printable Document Preview */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-950">
                      Challan Ready to Generate: {challanNo}
                    </p>
                    <p className="text-[11px] text-emerald-700">
                      Review the official material handover template below before saving.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    className="rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Document</span>
                  </Button>
                </div>
              </div>

              {/* Printable Document Box */}
              <div className="border border-slate-300 rounded-2xl p-2 sm:p-6 bg-slate-100/60 shadow-inner overflow-x-auto">
                <PrintableDeliveryChallan ref={printRef} challan={previewData} />
              </div>
            </div>
          )}
        </CardContent>

        {/* Footer Navigation */}
        <CardFooter className="p-6 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={loading}
                className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 text-xs h-10 px-4 gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous Step</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep < 4 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs h-10 px-5 gap-1.5 shadow-md shadow-orange-500/20"
              >
                <span>Continue to Next Step</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSaveChallan}
                disabled={loading || createdSuccess}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-11 px-6 gap-2 shadow-lg shadow-emerald-600/25"
              >
                {loading ? (
                  <>
                    <Spinner className="w-4 h-4 text-white" />
                    <span>Saving Delivery Voucher...</span>
                  </>
                ) : createdSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Saved! Redirecting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Confirm & Create Delivery Voucher</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
