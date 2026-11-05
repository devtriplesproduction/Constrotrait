"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createDeliveryChallan, getNextChallanNumber } from "@/actions/delivery-challan.actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { PrintableDeliveryChallan } from "./PrintableDeliveryChallan";
import { 
  Plus, 
  Trash2, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  Truck, 
  X, 
  FileText, 
  Building2, 
  User, 
  Phone,
  Calendar,
  Layers,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { DeliveryChallanItem, StaffMember } from "@/types/delivery-challan";
import { ClientSearchInput, ClientItem } from "./ClientSearchInput";
import { EmployeeSearchInput } from "./EmployeeSearchInput";

interface DeliveryChallanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: {
    first_name: string;
    last_name: string;
    designation?: string;
  };
  clients?: ClientItem[];
  staff?: StaffMember[];
}

export function DeliveryChallanFormModal({
  isOpen,
  onClose,
  userProfile,
  clients = [],
  staff = [],
}: DeliveryChallanFormModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Form State
  const [challanNo, setChallanNo] = useState("");
  const [challanDate, setChallanDate] = useState(todayStr);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [quickEmployeeName, setQuickEmployeeName] = useState("");
  
  // Material Details
  const [customerName, setCustomerName] = useState("");
  const [projectSiteName, setProjectSiteName] = useState("");
  const [materialTakenBy, setMaterialTakenBy] = useState("");
  const [companyAgencyName, setCompanyAgencyName] = useState("");
  const [mobileNo, setMobileNo] = useState("");

  // Items
  const [items, setItems] = useState<DeliveryChallanItem[]>([
    { sr_no: 1, material_description: "", quantity: "", remarks: "" },
  ]);

  // Purpose
  const [purpose, setPurpose] = useState<string>("Customer Material Handover");
  const [purposeOther, setPurposeOther] = useState("");

  // Receiver
  const [receiverName, setReceiverName] = useState("");
  const [receiverDate, setReceiverDate] = useState(todayStr);

  // Authorized by Lab
  const defaultIssuer = userProfile?.first_name 
    ? `${userProfile.first_name} ${userProfile.last_name || ""}`.trim()
    : "";
  const [issuedByName, setIssuedByName] = useState(defaultIssuer);
  const [issuedDate, setIssuedDate] = useState(todayStr);
  const [verifiedByName, setVerifiedByName] = useState("");

  // Fetch next challan number when modal opens
  useEffect(() => {
    if (isOpen) {
      getNextChallanNumber().then((no) => {
        setChallanNo(no);
      }).catch(console.error);

      if (userProfile?.first_name) {
        setIssuedByName(`${userProfile.first_name} ${userProfile.last_name || ""}`.trim());
      }
    }
  }, [isOpen, userProfile]);

  // Auto-fill from Client
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
    if (client.mobile) {
      setMobileNo(client.mobile);
    }
    toast({
      title: "Client Selected",
      description: `Autofilled details for "${client.name || client.company_name}".`,
    });
  };

  // Quick Employee autofill
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
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        sr_no: prev.length + 1,
        material_description: "",
        quantity: "",
        remarks: "",
      },
    ]);
  };

  // Remove Item Row
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
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

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();

    if (!challanNo.trim()) {
      toast({ title: "Validation Error", description: "Challan Number is required", variant: "destructive" });
      return;
    }
    if (!customerName.trim()) {
      toast({ title: "Validation Error", description: "Customer Name is required", variant: "destructive" });
      return;
    }
    if (!materialTakenBy.trim()) {
      toast({ title: "Validation Error", description: "Material Taken By (Person's Name) is required", variant: "destructive" });
      return;
    }
    const validItems = items.filter((it) => it.material_description.trim().length > 0);
    if (validItems.length === 0) {
      toast({ title: "Validation Error", description: "Please enter at least one material description", variant: "destructive" });
      return;
    }
    if (!receiverName.trim()) {
      // If receiver name is blank, we can default it to materialTakenBy for convenience
      setReceiverName(materialTakenBy.trim());
    }
    if (!issuedByName.trim()) {
      toast({ title: "Validation Error", description: "Issued By (Name) is required", variant: "destructive" });
      return;
    }

    setStep(2);
  };

  const handleSubmit = async () => {
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
        toast({ title: "Delivery Challan created successfully!" });
        handleClose();
        router.refresh();
      } else {
        toast({ title: "Error creating challan", description: res.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create challan", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedClientId("");
    setQuickEmployeeName("");
    setCustomerName("");
    setProjectSiteName("");
    setMaterialTakenBy("");
    setCompanyAgencyName("");
    setMobileNo("");
    setItems([{ sr_no: 1, material_description: "", quantity: "", remarks: "" }]);
    setPurpose("Customer Material Handover");
    setPurposeOther("");
    setReceiverName("");
    setVerifiedByName("");
    onClose();
  };

  if (!isOpen) return null;

  const previewChallanData = {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={cn(
          "bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-h-[92vh] flex flex-col overflow-hidden transition-all duration-300",
          step === 1 ? "max-w-4xl" : "max-w-4xl"
        )}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-white/95 backdrop-blur flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-snug">
                {step === 1 ? "New Material Handover / Delivery Challan" : "Review & Confirm Delivery Challan"}
              </h2>
              <p className="text-xs text-slate-500">
                {step === 1
                  ? "Enter material handover details and line items"
                  : "Verify that the generated delivery challan document is accurate before saving"}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Form Entry */}
        {step === 1 && (
          <form onSubmit={handleNextStep} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Top Quick Actions: Client & Employee Autofill Options */}
            <div className="bg-gradient-to-r from-orange-50/70 via-amber-50/50 to-slate-50 border border-orange-200/70 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-orange-950 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-orange-600" />
                <span>Quick Search & Autofill Options</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Search & Filter Clients */}
                <ClientSearchInput
                  clients={clients}
                  selectedClientId={selectedClientId}
                  onSelectClient={handleClientSelect}
                />

                {/* Search & Filter Employees */}
                <EmployeeSearchInput
                  label="Autofill from Employee"
                  placeholder="Search employee name, ID or dept..."
                  value={quickEmployeeName}
                  staff={staff}
                  onChange={handleQuickEmployeeSelect}
                  helperText="Search staff to autofill 'Material Taken By' & contact info"
                />
              </div>
            </div>

            {/* Challan Metadata */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className="h-10 rounded-xl text-xs font-semibold bg-white border-slate-200"
                />
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
                  className="h-10 rounded-xl text-xs bg-white border-slate-200"
                />
              </div>
            </div>

            {/* 1. Material Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <FileText className="w-4 h-4 text-orange-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  1. Material Details
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Customer Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer / client name"
                    required
                    className="h-9.5 rounded-xl text-xs"
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
                    className="h-9.5 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <EmployeeSearchInput
                    label="Material Taken By (Person's Name)"
                    required
                    value={materialTakenBy}
                    onChange={(val, member) => {
                      setMaterialTakenBy(val);
                      if (!receiverName) setReceiverName(val);
                      if (member?.phone_number && !mobileNo) setMobileNo(member.phone_number);
                      if (member?.department && !companyAgencyName) {
                        setCompanyAgencyName(`ConstroTrait (${member.department})`);
                      }
                    }}
                    staff={staff}
                    placeholder="Search employee or enter person's name..."
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
                    className="h-9.5 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile No.
                  </label>
                  <Input
                    type="tel"
                    value={mobileNo}
                    onChange={(e) => setMobileNo(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="h-9.5 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-orange-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Material Items
                  </h3>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddItem}
                  className="rounded-xl border-orange-200 text-orange-600 hover:bg-orange-50 text-xs h-8 gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Row</span>
                </Button>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">Sr.</th>
                      <th className="py-2.5 px-3">Material Description <span className="text-rose-500">*</span></th>
                      <th className="py-2.5 px-3 w-32">Quantity</th>
                      <th className="py-2.5 px-3">Identification / Remarks</th>
                      <th className="py-2.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="text"
                            value={item.material_description}
                            onChange={(e) => handleUpdateItem(idx, "material_description", e.target.value)}
                            placeholder="e.g. Concrete Cubes 150x150 mm (M25)"
                            required
                            className="h-8 text-xs rounded-lg"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="text"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(idx, "quantity", e.target.value)}
                            placeholder="e.g. 3 Nos / 50 Kg"
                            className="h-8 text-xs rounded-lg"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="text"
                            value={item.remarks}
                            onChange={(e) => handleUpdateItem(idx, "remarks", e.target.value)}
                            placeholder="Sample ID, batch, marks, etc."
                            className="h-8 text-xs rounded-lg"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Purpose of Handover */}
            <div className="space-y-3">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  2. Purpose of Handover
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  "Customer Material Handover",
                  "Material Taken for Testing",
                  "Material Collected from Lab",
                  "Other",
                ].map((opt) => (
                  <label
                    key={opt}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all",
                      purpose === opt
                        ? "bg-orange-50/80 border-orange-300 text-orange-950 shadow-xs ring-1 ring-orange-200"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <input
                      type="radio"
                      name="purpose"
                      value={opt}
                      checked={purpose === opt}
                      onChange={() => setPurpose(opt)}
                      className="accent-orange-600 w-4 h-4"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>

              {purpose === "Other" && (
                <div className="mt-2">
                  <Input
                    type="text"
                    value={purposeOther}
                    onChange={(e) => setPurposeOther(e.target.value)}
                    placeholder="Specify other handover purpose"
                    className="h-9 rounded-xl text-xs"
                    required
                  />
                </div>
              )}
            </div>

            {/* 3 & 4. Receiver and Authorized by Lab */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Receiver */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  3. Declaration by Receiver
                </h4>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    Receiver&apos;s Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="Receiver Name"
                    required
                    className="h-8.5 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Receiver Date</label>
                  <Input
                    type="date"
                    value={receiverDate}
                    onChange={(e) => setReceiverDate(e.target.value)}
                    className="h-8.5 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Lab Authorization */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  4. Authorized by Lab
                </h4>
                <div>
                  <EmployeeSearchInput
                    label="Issued By (Name)"
                    required
                    value={issuedByName}
                    onChange={(val) => setIssuedByName(val)}
                    staff={staff}
                    placeholder="Search employee or enter staff name..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Issue Date</label>
                    <Input
                      type="date"
                      value={issuedDate}
                      onChange={(e) => setIssuedDate(e.target.value)}
                      className="h-10 rounded-xl text-xs bg-white border-slate-200"
                    />
                  </div>
                  <div>
                    <EmployeeSearchInput
                      label="Verified By"
                      value={verifiedByName}
                      onChange={(val) => setVerifiedByName(val)}
                      staff={staff}
                      placeholder="Search staff name..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="rounded-xl border-slate-200 text-xs font-semibold h-10 px-5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs h-10 px-6 gap-2 shadow-md shadow-orange-500/25"
              >
                <span>Preview Challan</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </form>
        )}

        {/* Step 2: Live Preview & Save */}
        {step === 2 && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
              <div className="bg-white shadow-md border border-slate-200 rounded-lg w-full max-w-[820px]">
                <PrintableDeliveryChallan challan={previewChallanData as any} />
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-slate-200 bg-white flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="rounded-xl border-slate-200 text-xs font-semibold h-10 px-4 gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Edit</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs h-10 px-6 gap-2 shadow-md shadow-orange-500/25"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{loading ? "Saving..." : "Save Delivery Challan"}</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
