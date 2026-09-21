"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { clientWizardSchema, ClientWizardValues } from "@/lib/validations/client-wizard";
import { submitClientWizard, searchClientsAction } from "@/actions/client-wizard.actions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { SearchIcon } from "lucide-react";
import { Database } from "@/types/database";

const steps = [
  { id: "step1", title: "Client Details" },
  { id: "step2", title: "Test / Sample Details" },
];

export function ClientWizard({
  onSuccess
}: {
  onSuccess?: () => void
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Database["public"]["Tables"]["clients"]["Row"][]>([]);
  const [showResults, setShowResults] = useState(false);

  const { toast } = useToast();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ClientWizardValues>({
    resolver: zodResolver(clientWizardSchema),
    defaultValues: {
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
      testRequest: {
        material_id: "",
        material_details_location: "",
        sample_quantity: "",
        test_to_be_performed: "",
        grade: "",
        testing_day: "",
        test_method: "",
      }
    },
  });

  const [submitEnabled, setSubmitEnabled] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (currentStep === steps.length - 1) {
      // Use the timer to set it to true after 500ms, but initially we don't need to synchronously set it to false here if we manage state elsewhere.
      // Or we can just use the timer.
      timer = setTimeout(() => setSubmitEnabled(true), 500);
    } else {
      setSubmitEnabled(false);
    }
    return () => clearTimeout(timer);
  }, [currentStep]);

  // Debounced search
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

  const handleSelectClient = (client: Database["public"]["Tables"]["clients"]["Row"]) => {
    // Fill client form
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
    
    toast({
      title: "Client Auto-filled",
      description: `Details for ${client.name} loaded successfully.`,
    });
  };

  const handleNext = async () => {
    let isValid = false;
    
    if (currentStep === 0) {
      // Validate client subset
      isValid = await trigger("client");
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
      const result = await submitClientWizard(data);

      if (result.success) {
        toast({
          title: "Wizard Completed",
          description: "Client and Test details saved successfully.",
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

  return (
    <Card className="w-full max-w-5xl mx-auto shadow-xl border border-slate-200 bg-white rounded-2xl overflow-visible">
      <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
        <CardTitle className="text-xl font-bold text-slate-900 flex items-center justify-between">
          <span>Client Registration & Test Request</span>
          <span className="text-sm font-medium text-slate-500">
            Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
          </span>
        </CardTitle>
        <div className="flex w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-4">
          <motion.div
            className="h-full bg-orange-500"
            initial={{ width: `${((currentStep) / steps.length) * 100}%` }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </CardHeader>

      <CardContent className="min-h-[400px] mt-4 relative">
        {currentStep === 0 && (
          <div className="mb-6 relative z-50">
            <label className="text-sm font-semibold text-slate-700 mb-2 block">Search Existing Client</label>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search by Name, Mobile, Email, or GST..." 
                className="pl-9 pr-4"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if(searchResults.length > 0) setShowResults(true); }}
                onBlur={() => setTimeout(() => setShowResults(false), 200)}
              />
              {isSearching && (
                <div className="absolute right-3 top-2.5">
                  <Spinner className="h-4 w-4 text-slate-400" />
                </div>
              )}
            </div>
            
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-lg rounded-md overflow-hidden z-50 max-h-[300px] overflow-y-auto">
                {searchResults.map((client) => (
                  <div 
                    key={client.id}
                    onClick={() => handleSelectClient(client)}
                    className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                  >
                    <div className="font-medium text-slate-900">{client.name}</div>
                    <div className="text-xs text-slate-500 mt-1 flex gap-3">
                      {client.mobile && <span>📱 {client.mobile}</span>}
                      {client.email && <span>✉️ {client.email}</span>}
                      {client.gst_no && <span>📄 {client.gst_no}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {showResults && searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-lg rounded-md p-4 text-center text-sm text-slate-500 z-50">
                No clients found. You can proceed to create a new client.
              </div>
            )}
          </div>
        )}

        <form id="client-wizard-form" onSubmit={handleFormSubmit} onKeyDown={handleKeyDown}>
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div
                key="step1"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5 px-2 md:px-2 pb-6"
              >
                {/* Client Details Section */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Name of Customer <span className="text-red-500">*</span></label>
                  <Input {...register("client.name")} placeholder="Customer Name" />
                  {errors.client?.name && <p className="text-red-500 text-xs">{errors.client.name.message}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Mobile No.</label>
                  <Input {...register("client.mobile")} placeholder="Mobile Number" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Email ID</label>
                  <Input type="email" {...register("client.email")} placeholder="Email Address" />
                  {errors.client?.email && <p className="text-red-500 text-xs">{errors.client.email.message}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">GST Number</label>
                  <Input {...register("client.gst_no")} placeholder="GST Number" />
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Address of Customer</label>
                  <Input {...register("client.address")} placeholder="Customer Address" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Division</label>
                  <Input {...register("client.division")} placeholder="Division" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Name of Site</label>
                  <Input {...register("client.site_name")} placeholder="Site Name" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Name of Agency</label>
                  <Input {...register("client.agency_name")} placeholder="Agency Name" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Name of Project</label>
                  <Input {...register("client.project_name")} placeholder="Project Name" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Contact Person Name</label>
                  <Input {...register("client.contact_person")} placeholder="Contact Person" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Collected By</label>
                  <Input {...register("client.collected_by")} placeholder="Collected By" />
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Name for Dispatching the Report</label>
                  <Input {...register("client.dispatch_name")} placeholder="Dispatch Name" />
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-3">
                  <label className="text-sm font-semibold text-slate-700">Address for Dispatching the Report</label>
                  <Input {...register("client.dispatch_address")} placeholder="Dispatch Address" />
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
                className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 px-2 md:px-2 pb-6"
              >
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Material ID <span className="text-red-500">*</span></label>
                  <Input {...register("testRequest.material_id")} placeholder="Material ID" />
                  {errors.testRequest?.material_id && <p className="text-red-500 text-xs">{errors.testRequest.material_id.message}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Test To Be Performed <span className="text-red-500">*</span></label>
                  <Input {...register("testRequest.test_to_be_performed")} placeholder="Test To Be Performed" />
                  {errors.testRequest?.test_to_be_performed && <p className="text-red-500 text-xs">{errors.testRequest.test_to_be_performed.message}</p>}
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Material Details / Location</label>
                  <Input {...register("testRequest.material_details_location")} placeholder="Location / Details" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Number of Sample / Qty</label>
                  <Input {...register("testRequest.sample_quantity")} placeholder="Quantity" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Grade</label>
                  <Input {...register("testRequest.grade")} placeholder="Grade" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Testing Day</label>
                  <Input {...register("testRequest.testing_day")} placeholder="Testing Day" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Test Method to be used</label>
                  <Input {...register("testRequest.test_method")} placeholder="Test Method" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </CardContent>

      <CardFooter className="flex justify-between border-t border-slate-100 bg-slate-50 p-4 rounded-b-2xl">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrev}
          disabled={currentStep === 0 || isSubmitting}
          className="border-slate-200 hover:bg-slate-100 text-slate-700 font-medium px-6"
        >
          Previous
        </Button>

        {currentStep < steps.length - 1 ? (
          <Button type="button" onClick={handleNext} className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-8 shadow-sm">
            Next
          </Button>
        ) : (
          <Button type="submit" form="client-wizard-form" disabled={isSubmitting} className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-8 shadow-sm">
            {isSubmitting ? (
              <>
                <Spinner className="mr-2 h-4 w-4" /> Submitting...
              </>
            ) : (
              "Submit details"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
