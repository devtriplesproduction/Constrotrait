"use client";

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { clientWizardSchema, ClientWizardValues } from "@/lib/validations/client-wizard";
import { submitClientWizard, searchClientsAction, getNextUidAction, updateClientWizardAction } from "@/actions/client-wizard.actions";
import { getTestsAction } from "@/actions/test.actions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { SearchIcon, Check, Plus, Trash2, ChevronRight, CheckCircle2, ChevronLeft, User, Building2, FlaskConical, FileText } from "lucide-react";
import { Database } from "@/types/database";
import { PremiumDatePicker } from "@/components/ui/PremiumDatePicker";
import { Dropdown } from "@/components/ui/Dropdown";
import { PageHeader } from "@/components/modules/PageHeader";
import { ScrollArea } from "@/components/ui/ScrollArea";

const steps = [
  { id: "step1", title: "Customer Basic Details", icon: User },
  { id: "step2", title: "Site / Project Details", icon: Building2 },
  { id: "step3", title: "Select Test", icon: FlaskConical },
  { id: "step4", title: "Test Details", icon: FileText },
];

const TESTING_AGE_OPTIONS = [
  "Same Day (0 days)",
  "1 Day",
  "3 Days",
  "5 Days",
  "7 Days",
  "14 Days",
  "21 Days",
  "28 Days"
];

function calculateTestingDate(castingDateStr: string, testingAgeStr: string): string {
  if (!castingDateStr) return "";

  const castingDate = new Date(castingDateStr);
  if (isNaN(castingDate.getTime())) return "";

  let daysToAdd = 0;
  const match = testingAgeStr.match(/(\d+)/);
  if (match) {
    daysToAdd = parseInt(match[1], 10);
  }

  const testingDate = new Date(castingDate);
  testingDate.setDate(testingDate.getDate() + daysToAdd);

  return testingDate.toISOString().split('T')[0];
}

type TestMaster = Database["public"]["Tables"]["test_master"]["Row"];

export interface ClientWizardProps {
  mode?: "create" | "edit";
  initialData?: {
    client: Database["public"]["Tables"]["clients"]["Row"];
    jobEntryTest: Database["public"]["Tables"]["job_entry_tests"]["Row"];
  };
  onSuccess?: () => void;
}

export function ClientWizard({ mode = "create", initialData, onSuccess }: ClientWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitEnabled, setSubmitEnabled] = useState(false);
  const [nextUidPreview, setNextUidPreview] = useState<number | null>(null);

  // Search state for clients
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Database["public"]["Tables"]["clients"]["Row"][]>([]);
  const [showResults, setShowResults] = useState(false);

  // Test master data
  const [availableTests, setAvailableTests] = useState<TestMaster[]>([]);
  const [testSearchQuery, setTestSearchQuery] = useState("");
  const [testNablFilter, setTestNablFilter] = useState<"all" | "nabl" | "non-nabl">("all");
  const [testCategoryFilter, setTestCategoryFilter] = useState<"all" | "Construction" | "Environmental">("all");
  const [testCurrentPage, setTestCurrentPage] = useState(1);
  const testPageSize = 10;
  const [isLoadingTests, setIsLoadingTests] = useState(false);
  const [showTestResults, setShowTestResults] = useState(false);

  useEffect(() => {
    setTestCurrentPage(1);
  }, [testSearchQuery, testNablFilter, testCategoryFilter]);

  const { toast } = useToast();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    watch,
    control,
    reset,
    getValues,
    formState: { errors },
  } = useForm<ClientWizardValues>({
    resolver: zodResolver(clientWizardSchema),
    defaultValues: initialData ? {
      client: {
        id: initialData.client.id,
        name: initialData.client.name || "",
        address: initialData.client.address || "",
        division: initialData.client.division || "",
        site_name: initialData.client.site_name || "",
        agency_name: initialData.client.agency_name || "",
        project_name: initialData.client.project_name || "",
        dispatch_name: initialData.client.dispatch_name || "",
        dispatch_address: initialData.client.dispatch_address || "",
        contact_person: initialData.client.contact_person || "",
        mobile: initialData.client.mobile || "",
        email: initialData.client.email || "",
        collected_by: initialData.client.collected_by || "",
        gst_no: initialData.client.gst_no || "",
      },
      selectedTestId: initialData.jobEntryTest.test_master_id,
      jobEntryTest: {
        test_master_id: initialData.jobEntryTest.test_master_id,
        test_name: "", // Will be updated when tests load
        test_method: initialData.jobEntryTest.test_method || "",
        material_id: initialData.jobEntryTest.material_id || "",
        material_details_location: initialData.jobEntryTest.material_details_location || "",
        sample_quantity: initialData.jobEntryTest.sample_quantity || "",
        grade: initialData.jobEntryTest.grade || "",
        testing_day: initialData.jobEntryTest.testing_day || "",
        date_of_receiving: initialData.jobEntryTest.date_of_receiving || "",
        date_of_casting: initialData.jobEntryTest.date_of_casting || "",
        testing_age: initialData.jobEntryTest.testing_age || "",
        date_of_testing: initialData.jobEntryTest.date_of_testing || "",
        material_description: initialData.jobEntryTest.material_description || "",
        additional_details_values: (initialData.jobEntryTest.additional_details_values as Record<string, string>) || {},
      },
    } : {
      client: {
        name: "",
        address: "",
        division: "",
        site_name: "",
        agency_name: "",
        project_name: "",
        dispatch_name: "",
        dispatch_address: "",
        contact_person: "",
        mobile: "",
        email: "",
        collected_by: "",
        gst_no: "",
      },
      selectedTestId: "",
      jobEntryTest: {
        test_master_id: "",
        test_name: "",
        test_method: "",
        material_id: "",
        material_details_location: "",
        sample_quantity: "",
        grade: "",
        testing_day: "",
        date_of_receiving: "",
        date_of_casting: "",
        testing_age: "",
        date_of_testing: "",
        material_description: "",
        additional_details_values: {},
      },
    },
  });

  const selectedTestId = watch("selectedTestId");
  const jobEntryTest = watch("jobEntryTest");

  // Enable submit button after delay
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (currentStep === steps.length - 1) {
      timer = setTimeout(() => setSubmitEnabled(true), 500);
      // Fetch next UID preview when reaching the last step, only if creating
      if (mode !== "edit" && nextUidPreview === null) {
        getNextUidAction().then(res => {
          if (res.success && res.nextUid) {
            setNextUidPreview(res.nextUid);
          }
        });
      }
    } else {
      setSubmitEnabled(false);
    }
    return () => clearTimeout(timer);
  }, [currentStep, nextUidPreview, mode]);

  // Debounced search for clients
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        const result = await searchClientsAction(searchQuery);
        if (result.success && result.data) {
          setSearchResults(result.data);
          setShowResults(true);
        }
        setIsSearching(false);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Fetch tests when reaching step 2
  useEffect(() => {
    if ((currentStep === 1 || mode === "edit") && availableTests.length === 0) {
      const fetchTests = async () => {
        setIsLoadingTests(true);
        const result = await getTestsAction();
        if (result.success && result.data) {
          setAvailableTests(result.data as TestMaster[]);
          // If in edit mode, set the test name based on the loaded tests
          if (mode === "edit" && initialData?.jobEntryTest?.test_master_id) {
            const test = (result.data as TestMaster[]).find(t => t.id === initialData.jobEntryTest.test_master_id);
            if (test) {
              setValue("jobEntryTest.test_name", test.component_parameter || test.specific_test || "");
            }
          }
        }
        setIsLoadingTests(false);
      };
      fetchTests();
    }
  }, [currentStep, availableTests.length, mode, initialData, setValue]);

  const handleSelectClient = async (client: Database["public"]["Tables"]["clients"]["Row"]) => {
    setValue("client.id", client.id);
    setValue("client.name", client.name || "");
    setValue("client.address", client.address || "");
    setValue("client.division", client.division || "");
    setValue("client.site_name", client.site_name || "");
    setValue("client.agency_name", client.agency_name || "");
    setValue("client.project_name", client.project_name || "");
    setValue("client.dispatch_name", client.dispatch_name || "");
    setValue("client.dispatch_address", client.dispatch_address || "");
    setValue("client.contact_person", client.contact_person || "");
    setValue("client.mobile", client.mobile || "");
    setValue("client.email", client.email || "");
    setValue("client.collected_by", client.collected_by || "");
    setValue("client.gst_no", client.gst_no || "");

    setShowResults(false);
    setSearchQuery("");

    await trigger("client");

    toast({
      title: "Client Auto-filled",
      description: `Details for ${client.name} loaded successfully.`,
    });
  };

  const handleSelectTest = (id: string) => {
    setValue("selectedTestId", id);

    const test = availableTests.find(t => t.id === id);
    if (!test) return;

    const initialAdditionalDetails: Record<string, string> = {};
    if (test.additional_details) {
      test.additional_details.forEach(detail => {
        initialAdditionalDetails[detail] = "";
      });
    }

    setValue("jobEntryTest", {
      test_master_id: test.id,
      test_name: test.component_parameter || test.specific_test,
      test_method: test.test_method || "",
      material_id: "",
      material_details_location: "",
      sample_quantity: "",
      grade: "",
      testing_day: "",
      date_of_receiving: "",
      date_of_casting: "",
      testing_age: "",
      date_of_testing: "",
      material_description: "",
      additional_details_values: initialAdditionalDetails,
    });
  };

  const handleNext = async () => {
    let isValid = false;

    if (currentStep === 0 || currentStep === 1) {
      isValid = await trigger("client");
    } else if (currentStep === 2) {
      isValid = true;
    }

    if (isValid) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
      e.preventDefault();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep === steps.length - 1 && submitEnabled) {
      handleSubmit(onSubmit)(e);
    }
  };

  const onSubmit = async (data: ClientWizardValues) => {
    setIsSubmitting(true);
    try {
      let result;
      if (mode === "edit" && initialData?.jobEntryTest?.id) {
        result = await updateClientWizardAction(data, initialData.jobEntryTest.id);
      } else {
        result = await submitClientWizard(data);
      }

      if (result.success) {
        toast({
          title: mode === "edit" ? "Inward Updated" : "Wizard Completed",
          description: mode === "edit"
            ? "Inward test details updated successfully."
            : ("uids" in result && Array.isArray(result.uids) && result.uids.length > 0)
              ? `Client and Test details saved successfully. Generated UID: ${result.uids.join(", ")}`
              : "Client details saved successfully (No test selected).",
        });
        reset();
        setCurrentStep(0);
        router.refresh();
        onSuccess?.();
      } else {
        toast({
          variant: "error",
          title: "Error",
          description: result.error || "Failed to save details",
        });
      }
    } catch (error) {
      toast({
        variant: "error",
        title: "Error",
        description: (error as Error).message || "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTests = availableTests.filter((test) => {
    if (testNablFilter === "nabl" && test.is_nabl !== true) return false;
    if (testNablFilter === "non-nabl" && test.is_nabl === true) return false;
    if (testCategoryFilter !== "all" && test.category !== testCategoryFilter) return false;

    const q = testSearchQuery.toLowerCase();
    if (!q) return true;
    return (
      (test.material_product && test.material_product.toLowerCase().includes(q)) ||
      (test.component_parameter && test.component_parameter.toLowerCase().includes(q)) ||
      (test.specific_test && test.specific_test.toLowerCase().includes(q)) ||
      (test.discipline_group && test.discipline_group.toLowerCase().includes(q))
    );
  });

  const testTotalPages = Math.ceil(filteredTests.length / testPageSize);
  const paginatedTests = filteredTests.slice((testCurrentPage - 1) * testPageSize, testCurrentPage * testPageSize);

  return (
    <Card className="w-full max-w-5xl mx-auto shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 bg-white rounded-2xl overflow-hidden flex flex-col md:flex-row h-[600px]">

      {/* Left Sidebar Stepper */}
      <div className="w-full md:w-70 lg:w-72 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100 p-6 flex flex-col shrink-0">
        <div className="mb-10">
          <PageHeader
            title="Client Registration"

            className="flex-col items-start gap-6 [&_h1]:text-2xl [&_h1]:leading-tight"
          />
        </div>

        <div className="flex flex-col gap-2 relative">
          {steps.map((step, index) => {
            const isActive = currentStep === index;
            const isCompleted = currentStep > index;
            return (
              <div key={step.id} className="relative z-10" onClick={() => isCompleted && setCurrentStep(index)}>
                <div className={`relative flex items-center gap-3 p-3 rounded-xl transition-all duration-300 cursor-pointer overflow-hidden ${isActive ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-200/60 text-orange-600' : isCompleted ? 'text-slate-600 hover:bg-slate-200/40' : 'text-slate-400 opacity-60'}`}>
                  {isActive && (
                    <motion.div layoutId="activeStep" className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />
                  )}
                  <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${isActive ? 'bg-orange-100 text-orange-600' : isCompleted ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : <step.icon className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-sm font-bold truncate">{step.title}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">

        <ScrollArea
          orientation="vertical"
          className="flex-1 p-6 md:p-8 pt-4 md:pt-6 pr-4"
        >

          <form id="client-wizard-form" onSubmit={handleFormSubmit} onKeyDown={handleKeyDown}>
            <AnimatePresence mode="wait">
              {currentStep === 0 && (
                <motion.div
                  key="step1"
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -50, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pb-4"
                >
                  <div className="col-span-full mb-4 pb-4 border-b border-slate-200/60 flex items-center gap-3">
                    <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 text-orange-500 shadow-sm shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Customer Basic Details</h3>
                      <p className="text-[15px] text-slate-500 font-medium">Provide the fundamental information about the customer.</p>
                    </div>
                  </div>

                  <div className="col-span-full mb-2 relative z-50">
                    <div className="relative group max-w-md">
                      <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-orange-500 transition-colors duration-300" />
                      <Input
                        placeholder="Search Client by Name, Mobile, Email, or GST..."
                        className="pl-12 pr-4 h-11 rounded-xl border-slate-200/80 bg-slate-50/50 text-[13px] shadow-[0_1px_3px_rgba(0,0,0,0.02)] focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-orange-500/10 focus-visible:border-orange-500 transition-all duration-300"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
                        onBlur={() => setTimeout(() => setShowResults(false), 200)}
                      />
                      {isSearching && (
                        <div className="absolute right-5 top-4">
                          <Spinner className="h-5 w-5 text-orange-500" />
                        </div>
                      )}
                    </div>

                    {showResults && searchResults.length > 0 && (
                      <div className="absolute top-[calc(100%+0.5rem)] left-0 right-0 bg-white border border-slate-200 shadow-2xl rounded-xl overflow-hidden z-50 max-h-[350px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 ring-1 ring-slate-900/5 max-w-md">
                        {searchResults.map((client, idx) => (
                          <div
                            key={client.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectClient(client);
                            }}
                            className={`p-4 hover:bg-orange-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors duration-150 ${idx === 0 ? 'rounded-t-xl' : ''}`}
                          >
                            <div className="font-semibold text-slate-900 text-base">{client.name}</div>
                            <div className="text-xs font-medium text-slate-500 mt-1.5 flex gap-4">
                              {client.mobile && <span className="flex items-center gap-1"><span className="text-slate-400">📱</span> {client.mobile}</span>}
                              {client.email && <span className="flex items-center gap-1"><span className="text-slate-400">✉️</span> {client.email}</span>}
                              {client.gst_no && <span className="flex items-center gap-1"><span className="text-slate-400">📄</span> {client.gst_no}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Name of Customer <span className="text-red-500">*</span></label>
                    <Input {...register("client.name")} placeholder="Customer Name" className="text-[13px] h-11 rounded-xl bg-slate-50/50 border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-orange-500/20" />
                    {errors.client?.name && <p className="text-red-500 text-xs">{errors.client.name.message}</p>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Mobile No.</label>
                    <Input {...register("client.mobile")} placeholder="Mobile Number" className="text-[13px] h-11 rounded-xl bg-slate-50/50 border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-orange-500/20" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Email ID</label>
                    <Input type="email" {...register("client.email")} placeholder="Email Address" className="text-[13px] h-11 rounded-xl bg-slate-50/50 border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-orange-500/20" />
                    {errors.client?.email && <p className="text-red-500 text-xs">{errors.client.email.message}</p>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-slate-700 mb-0.5">GST Number</label>
                    <Input {...register("client.gst_no")} placeholder="GST Number" className="text-[13px] h-11 rounded-xl bg-slate-50/50 border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-orange-500/20" />
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Address of Customer</label>
                    <textarea
                      {...register("client.address")}
                      placeholder="Customer Address"
                      rows={3}
                      className="flex w-full rounded-xl border border-border bg-slate-50/50 px-4 py-2.5 text-[13px] shadow-sm transition-all duration-300 placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 hover:border-orange-500/50 disabled:cursor-not-allowed disabled:opacity-50 text-foreground border-slate-200/80 focus-visible:bg-white min-h-[80px] resize-y"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Division</label>
                    <Input {...register("client.division")} placeholder="Division" className="text-[13px] h-11 rounded-xl bg-slate-50/50 border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-orange-500/20" />
                  </div>

                </motion.div>
              )}

              {currentStep === 1 && (
                <motion.div
                  key="step2"
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -50, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 px-2 md:px-2 pb-4"
                >
                  <div className="col-span-full mb-4 pb-4 border-b border-slate-200/60 flex items-center gap-3">
                    <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 text-orange-500 shadow-sm shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Site & Project Details</h3>
                      <p className="text-[15px] text-slate-500 font-medium">Enter information regarding the site, agency, and project.</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Name of Site</label>
                    <Input {...register("client.site_name")} placeholder="Site Name" className="text-[13px] h-11 rounded-xl bg-slate-50/50 border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-orange-500/20" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Name of Agency</label>
                    <Input {...register("client.agency_name")} placeholder="Agency Name" className="text-[13px] h-11 rounded-xl bg-slate-50/50 border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-orange-500/20" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Name of Project</label>
                    <Input {...register("client.project_name")} placeholder="Project Name" className="text-[13px] h-11 rounded-xl bg-slate-50/50 border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-orange-500/20" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Contact Person Name</label>
                    <Input {...register("client.contact_person")} placeholder="Contact Person" className="text-[13px] h-11 rounded-xl bg-slate-50/50 border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-orange-500/20" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Collected By</label>
                    <Input {...register("client.collected_by")} placeholder="Collected By" className="text-[13px] h-11 rounded-xl bg-slate-50/50 border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-orange-500/20" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Name for Dispatching the Report</label>
                    <Input {...register("client.dispatch_name")} placeholder="Dispatch Name" className="text-[13px] h-11 rounded-xl bg-slate-50/50 border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-orange-500/20" />
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Address for Dispatching the Report</label>
                    <textarea
                      {...register("client.dispatch_address")}
                      placeholder="Dispatch Address"
                      rows={3}
                      className="flex w-full rounded-xl border border-border bg-slate-50/50 px-4 py-2.5 text-[13px] shadow-sm transition-all duration-300 placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 hover:border-orange-500/50 disabled:cursor-not-allowed disabled:opacity-50 text-foreground border-slate-200/80 focus-visible:bg-white min-h-[80px] resize-y"
                    />
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step3"
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -50, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col px-2 md:px-2 pb-4"
                >
                  {isLoadingTests ? (
                    <div className="flex justify-center items-center py-20">
                      <Spinner className="w-8 h-8 text-orange-500" />
                    </div>
                  ) : (
                    <div className="space-y-4 max-w-4xl">
                      <div className="mb-4 pb-4 border-b border-slate-200/60 flex items-center gap-3">
                        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 text-orange-500 shadow-sm shrink-0">
                          <FlaskConical className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Select Test </h3>
                          <p className="text-[15px] text-slate-500 font-medium">Search and select the specific test required for this request.</p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <Dropdown
                          options={[
                            { label: "All NABL Status", value: "all" },
                            { label: "NABL Accredited", value: "nabl" },
                            { label: "Non-NABL", value: "non-nabl" }
                          ]}
                          value={testNablFilter}
                          onChange={(val) => setTestNablFilter(val as any)}
                          buttonClassName="h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white transition-all cursor-pointer"
                          className="flex-1"
                        />
                        <Dropdown
                          options={[
                            { label: "All Categories", value: "all" },
                            { label: "Construction", value: "Construction" },
                            { label: "Environmental", value: "Environmental" }
                          ]}
                          value={testCategoryFilter}
                          onChange={(val) => setTestCategoryFilter(val as any)}
                          buttonClassName="h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white transition-all cursor-pointer"
                          className="flex-1"
                        />
                      </div>

                      <div className="flex flex-col gap-4 relative z-50">
                        <div className="relative group">
                          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                          <Input
                            placeholder="Search and select tests by name, material, or method..."
                            value={testSearchQuery}
                            onChange={(e) => {
                              setTestSearchQuery(e.target.value);
                              setShowTestResults(true);
                            }}
                            onFocus={() => setShowTestResults(true)}
                            onBlur={() => setTimeout(() => setShowTestResults(false), 200)}
                            className="pl-12 h-11 rounded-xl bg-slate-50/50 border-slate-200 shadow-sm transition-all focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-orange-500/20 text-base"
                          />
                        </div>

                        {showTestResults && filteredTests.length > 0 && (
                          <ScrollArea
                            orientation="vertical"
                            className="absolute top-[calc(100%+0.5rem)] left-0 right-0 bg-white border border-slate-200 shadow-2xl rounded-xl z-50 max-h-[350px] animate-in fade-in slide-in-from-top-2 ring-1 ring-slate-900/5"
                          >
                            <div className="p-1.5 flex flex-col gap-1">
                              {filteredTests.slice(0, 50).map((test) => (
                                <div
                                  key={test.id}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelectTest(test.id);
                                    setShowTestResults(false);
                                    setTestSearchQuery("");
                                  }}
                                  className="group p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer transition-all duration-200 flex flex-col gap-1.5"
                                >
                                  <div className="font-semibold text-[14px] text-slate-700 group-hover:text-slate-900 transition-colors pl-1">{test.component_parameter || test.specific_test}</div>
                                  <div className="flex gap-4 text-[11px] text-slate-500 font-medium pl-1">
                                    <span className="flex items-center gap-1">
                                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-bold">MAT</span>
                                      <span className="text-slate-600 truncate max-w-[150px]" title={test.material_product}>{test.material_product}</span>
                                    </span>
                                    {test.test_method && (
                                      <span className="flex items-center gap-1">
                                        <span className="text-slate-400 uppercase tracking-wider text-[9px] font-bold">MTH</span>
                                        <span className="text-slate-600 truncate max-w-[150px]" title={test.test_method}>{test.test_method}</span>
                                      </span>
                                    )}
                                    {test.is_nabl && <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold ml-auto border border-emerald-100 uppercase tracking-wider text-[9px]">NABL</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        )}
                      </div>

                      <div className="flex flex-col flex-1 min-h-0 mt-2 relative z-0">
                        {selectedTestId ? (
                          (() => {
                            const test = availableTests.find(t => t.id === selectedTestId);
                            if (!test) return null;
                            return (
                              <div className="p-3.5 rounded-xl bg-gradient-to-br from-orange-50 to-white border border-orange-200 shadow-sm relative overflow-hidden group transition-all">
                                <div className="absolute top-0 right-0 bg-gradient-to-l from-orange-100 to-orange-50 text-orange-800 text-[9px] font-bold px-3 py-1 rounded-bl-xl tracking-wider uppercase flex items-center gap-1 shadow-sm border-b border-l border-orange-200">
                                  <CheckCircle2 className="w-3 h-3 text-orange-600" /> Selected
                                </div>

                                <div className="flex items-start gap-3 mb-3">
                                  <div className="w-8 h-8 rounded-lg bg-orange-100/80 flex items-center justify-center shrink-0 border border-orange-200 shadow-inner mt-0.5">
                                    <Check className="w-4 h-4 text-orange-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-[14px] text-slate-900 pr-20 leading-snug">
                                      {test.component_parameter || test.specific_test}
                                    </h4>
                                    {test.is_nabl && (
                                      <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-bold rounded-full uppercase tracking-wider shadow-sm">
                                        <CheckCircle2 className="w-2.5 h-2.5" /> NABL Accredited
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-col gap-1.5 pt-2 border-t border-orange-100/50">
                                  <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white/60 border border-orange-100/50 hover:bg-white transition-colors shadow-sm">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Material</span>
                                    <span className="text-[12px] font-semibold text-slate-700 text-right">{test.material_product}</span>
                                  </div>
                                  {test.test_method && (
                                    <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white/60 border border-orange-100/50 hover:bg-white transition-colors shadow-sm">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Method</span>
                                      <span className="text-[12px] font-semibold text-slate-700 text-right">{test.test_method}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="py-12 text-center flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 h-full">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                              <SearchIcon className="w-6 h-6 text-slate-400" />
                            </div>
                            <h3 className="text-slate-800 font-bold text-lg mb-1">No test selected</h3>
                            <p className="text-slate-500 text-sm max-w-xs mx-auto">Use the search field above to find and select a test for this request.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="step4"
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -50, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6 pb-6"
                >
                  <div className="mb-4 pb-4 border-b border-slate-200/60 flex items-center gap-3">
                    <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 text-orange-500 shadow-sm shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Test Details</h3>
                      <p className="text-[15px] text-slate-500 font-medium">Enter the specific material and testing details.</p>
                    </div>
                  </div>
                  {!selectedTestId ? (
                    <div className="text-center py-12 text-slate-500">
                      No test selected. You can proceed to submit, or go back to step 3 to select a test.
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 shadow-sm relative">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500 rounded-l-xl"></div>
                      <div className="mb-4 pb-3 border-b border-slate-200">
                        <h3 className="text-lg font-bold text-slate-900">{jobEntryTest.test_name}</h3>
                        <p className="text-sm text-slate-500">Method: {jobEntryTest.test_method}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="flex flex-col gap-1.5 col-span-full md:col-span-1">
                          <label className="text-[13px] font-semibold text-slate-700 mb-0.5">{mode === "edit" ? "UID" : "UID Preview"}</label>
                          <Input value={mode === "edit" ? initialData?.jobEntryTest.uid : (nextUidPreview !== null ? nextUidPreview.toString() : "Loading...")} readOnly className="bg-slate-100 text-slate-500 font-medium text-orange-600 border-orange-200 focus-visible:ring-0" />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[13px] font-semibold text-slate-700 mb-0.5">MATERIAL ID <span className="text-red-500">*</span></label>
                          <Input {...register(`jobEntryTest.material_id`)} placeholder="Material ID" />
                          {errors.jobEntryTest?.material_id && <p className="text-red-500 text-xs">{errors.jobEntryTest.material_id?.message}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Material Description</label>
                          <Input {...register(`jobEntryTest.material_description`)} placeholder="Material Description" />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[13px] font-semibold text-slate-700 mb-0.5">MATERIAL DETAILS / Location</label>
                          <Input {...register(`jobEntryTest.material_details_location`)} placeholder="Location / Details" />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[13px] font-semibold text-slate-700 mb-0.5">NUMBER OF SAMPLE / QTY</label>
                          <Input {...register(`jobEntryTest.sample_quantity`)} placeholder="Quantity" />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[13px] font-semibold text-slate-700 mb-0.5">GRADE</label>
                          <Input {...register(`jobEntryTest.grade`)} placeholder="Grade" />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Date of Receiving</label>
                          <PremiumDatePicker
                            value={jobEntryTest.date_of_receiving}
                            onChange={(val) => setValue(`jobEntryTest.date_of_receiving`, val, { shouldValidate: true })}
                            side="right"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Date of Casting</label>
                          <PremiumDatePicker
                            value={jobEntryTest.date_of_casting}
                            onChange={(val) => {
                              setValue(`jobEntryTest.date_of_casting`, val, { shouldValidate: true });
                              const currentValues = getValues(`jobEntryTest`);
                              const newTestingDate = calculateTestingDate(val, currentValues.testing_age || "");
                              setValue(`jobEntryTest.date_of_testing`, newTestingDate, { shouldValidate: true });
                            }}
                            side="left"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Testing Age</label>
                          <Dropdown
                            options={TESTING_AGE_OPTIONS.map(opt => ({ label: opt, value: opt }))}
                            value={watch(`jobEntryTest.testing_age`)}
                            onChange={(val) => {
                              setValue(`jobEntryTest.testing_age`, val, { shouldValidate: true });
                              const currentValues = getValues(`jobEntryTest`);
                              const newTestingDate = calculateTestingDate(currentValues.date_of_casting || "", val);
                              setValue(`jobEntryTest.date_of_testing`, newTestingDate, { shouldValidate: true });
                            }}
                            placeholder="Select Testing Age..."
                            buttonClassName="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white cursor-pointer"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Date of Testing</label>
                          <PremiumDatePicker
                            value={jobEntryTest.date_of_testing}
                            onChange={() => { }}
                            disabled={true}
                            side="right"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Testing Day</label>
                          <Input {...register(`jobEntryTest.testing_day`)} placeholder="Testing Day" />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Test Method</label>
                          <Input {...register(`jobEntryTest.test_method`)} readOnly className="bg-slate-100 text-slate-500" />
                        </div>

                        {/* Render dynamic additional details inputs if available */}
                        {availableTests.find(t => t.id === selectedTestId)?.additional_details && availableTests.find(t => t.id === selectedTestId)!.additional_details!.length > 0 && (
                          <div className="col-span-full mt-2">
                            <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Additional Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                              {availableTests.find(t => t.id === selectedTestId)!.additional_details!.map((detailLabel, detailIdx) => (
                                <div key={detailIdx} className="flex flex-col gap-1.5">
                                  <label className="text-[13px] font-semibold text-slate-700 mb-0.5">{detailLabel}</label>
                                  <Input
                                    {...register(`jobEntryTest.additional_details_values.${detailLabel}`)}
                                    placeholder={`Enter ${detailLabel}`}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </ScrollArea>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 mt-auto shrink-0 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0 || isSubmitting}
            className="text-slate-600 hover:text-slate-900 font-semibold tracking-wide px-8 h-12 rounded-xl bg-white border-slate-200 shadow-sm transition-all"
          >
            &larr; CANCEL
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button type="button" onClick={handleNext} className="bg-slate-900 hover:bg-slate-800 text-white font-bold tracking-wide px-10 h-12 rounded-xl shadow-lg shadow-slate-900/20 transition-all hover:scale-[1.02]">
              CONTINUE &rarr;
            </Button>
          ) : (
            <Button type="submit" form="client-wizard-form" disabled={isSubmitting} className="bg-orange-600 hover:bg-orange-700 text-white font-bold tracking-wide px-10 h-12 rounded-xl shadow-lg shadow-orange-600/30 transition-all hover:scale-[1.02]">
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-5 w-5" /> Submitting...
                </>
              ) : (
                "SUBMIT REQUEST"
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>

  );
}
