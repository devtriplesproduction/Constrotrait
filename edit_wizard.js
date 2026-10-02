const fs = require('fs');

let content = fs.readFileSync('src/components/modules/clients/ClientWizard.tsx', 'utf8');

// 1. Remove Division from Step 1
content = content.replace(
  /<div className="flex flex-col gap-1\.5">\s*<label className="text-\[13px\] font-semibold text-slate-700 mb-0\.5">Division<\/label>[\s\S]*?<\/div>/,
  ''
);

// 2. Change Steps order
const oldSteps = `const steps = [
  { id: "step1", title: "Customer Basic Details", icon: User },
  { id: "step2", title: "Site / Project Details", icon: Building2 },
  { id: "step3", title: "Select Test", icon: FlaskConical },
  { id: "step4", title: "Test Details", icon: FileText },
];`;
const newSteps = `const steps = [
  { id: "step1", title: "Customer Basic Details", icon: User },
  { id: "step2", title: "Select Test", icon: FlaskConical },
  { id: "step3", title: "Job Entry Details", icon: Building2 },
  { id: "step4", title: "Test Details", icon: FileText },
];`;
content = content.replace(oldSteps, newSteps);

// 3. Insert hasNonNabl and jobEntry in default values
const hasNonNablInsertion = `
  const { watch, register, setValue, getValues, control, handleSubmit, trigger, formState: { errors, isValid, isSubmitting } } = methods;

  const selectedTestIds = watch("selectedTestIds");
  const jobEntryTests = watch("jobEntryTests");
  
  const hasNonNabl = selectedTestIds.some(id => {
    const test = availableTests.find(t => t.id === id);
    return test ? !test.is_nabl : false;
  });
`;
content = content.replace(
  /const {[\s\S]*?} = methods;\s*const selectedTestIds = watch\("selectedTestIds"\);\s*const jobEntryTests = watch\("jobEntryTests"\);/,
  hasNonNablInsertion.trim()
);

// 4. defaultValues update
const oldDefaultValues = `defaultValues: initialData ? {
      client: {
        id: initialData.client.id,
        name: initialData.client.name || "",
        company_name: initialData.client.company_name || "",
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
      selectedTestIds: initialData.jobEntryTest?.test_master_id ? [initialData.jobEntryTest.test_master_id] : [],
      jobEntryTests: initialData.jobEntryTest ? [initialData.jobEntryTest] : [],
    } : {`;
const newDefaultValues = `defaultValues: initialData ? {
      client: {
        id: initialData.client.id,
        name: initialData.client.name || "",
        company_name: initialData.client.company_name || "",
        address: initialData.client.address || "",
        mobile: initialData.client.mobile || "",
        email: initialData.client.email || "",
        gst_no: initialData.client.gst_no || "",
      },
      jobEntry: {
        division: initialData.client.division || "",
        site_name: initialData.client.site_name || "",
        agency_name: initialData.client.agency_name || "",
        project_name: initialData.client.project_name || "",
        dispatch_name: initialData.client.dispatch_name || "",
        dispatch_address: initialData.client.dispatch_address || "",
        contact_person: initialData.client.contact_person || "",
        collected_by: initialData.client.collected_by || "",
      },
      selectedTestIds: initialData.jobEntryTest?.test_master_id ? [initialData.jobEntryTest.test_master_id] : [],
      jobEntryTests: initialData.jobEntryTest ? [initialData.jobEntryTest] : [],
    } : {
      jobEntry: {},`;
content = content.replace(oldDefaultValues, newDefaultValues);

// 5. Update next/back logic
const oldHandleNext = `const handleNext = async () => {
    let fieldsToValidate: string[] = [];
    if (currentStep === 0) fieldsToValidate = ["client.name", "client.email"];
    if (currentStep === 1) fieldsToValidate = []; // Add site details validation if required
    if (currentStep === 2) {
      if (selectedTestIds.length === 0) {
        toast.error("Please select at least one test.");
        return;
      }
    }
    if (currentStep === 3) fieldsToValidate = ["jobEntryTests"];

    const isStepValid = await trigger(fieldsToValidate as any);
    if (isStepValid) {
      if (currentStep < steps.length - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        handleSubmit(onSubmit)();
      }
    }
  };`;

const newHandleNext = `const handleNext = async () => {
    let fieldsToValidate: string[] = [];
    if (currentStep === 0) fieldsToValidate = ["client.name", "client.email"];
    if (currentStep === 1) {
      if (selectedTestIds.length === 0) {
        toast.error("Please select at least one test.");
        return;
      }
    }
    if (currentStep === 2) fieldsToValidate = []; 
    if (currentStep === 3) fieldsToValidate = ["jobEntryTests"];

    const isStepValid = await trigger(fieldsToValidate as any);
    if (isStepValid) {
      if (currentStep === 1 && !hasNonNabl) {
        setCurrentStep(3); // Skip Job Entry Details if only NABL
      } else if (currentStep < steps.length - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        handleSubmit(onSubmit)();
      }
    }
  };`;
content = content.replace(oldHandleNext, newHandleNext);

const oldHandleBack = `const handleBack = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };`;
const newHandleBack = `const handleBack = () => {
    if (currentStep === 3 && !hasNonNabl) {
      setCurrentStep(1);
    } else if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };`;
content = content.replace(oldHandleBack, newHandleBack);

// 6. Swap JSX
// {currentStep === 1 && ( ... Site & Project Details ... )} => change to currentStep === 2
// {currentStep === 2 && ( ... Select Test ... )} => change to currentStep === 1
content = content.replace('{currentStep === 1 && (', '{___TEMP_STEP_1___ && (');
content = content.replace('{currentStep === 2 && (', '{currentStep === 1 && (');
content = content.replace('{___TEMP_STEP_1___ && (', '{currentStep === 2 && (');

// Now replace the contents of Step 2 (now currentStep === 2) which was Site & Project Details
const oldJobEntryJSX = `<h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Site & Project Details</h3>
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
                  </div>`;

const newJobEntryJSX = `<h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Job Entry Details</h3>
                      <p className="text-[15px] text-slate-500 font-medium">Enter additional non-NABL details.</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Division</label>
                    <Input {...register("jobEntry.division")} placeholder="Division" className="text-[13px] h-11 rounded-xl bg-slate-50/50 border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Name of Site</label>
                    <Input {...register("jobEntry.site_name")} placeholder="Site Name" className="text-[13px] h-11 rounded-xl bg-slate-50/50 border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Name of Agency</label>
                    <Input {...register("jobEntry.agency_name")} placeholder="Agency Name" className="text-[13px] h-11 rounded-xl bg-slate-50/50 border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Name of Project</label>
                    <Input {...register("jobEntry.project_name")} placeholder="Project Name" className="text-[13px] h-11 rounded-xl bg-slate-50/50 border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Contact Person Name</label>
                    <Input {...register("jobEntry.contact_person")} placeholder="Contact Person" className="text-[13px] h-11 rounded-xl bg-slate-50/50 border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Collected By</label>
                    <Input {...register("jobEntry.collected_by")} placeholder="Collected By" className="text-[13px] h-11 rounded-xl bg-slate-50/50 border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Invoice No.</label>
                    <Input {...register("jobEntry.invoice_no")} placeholder="Invoice Number" className="text-[13px] h-11 rounded-xl bg-slate-50/50 border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]" />
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Invoice Date</label>
                    <Input type="date" {...register("jobEntry.invoice_date")} className="text-[13px] h-11 rounded-xl bg-slate-50/50 border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Letter Reference</label>
                    <Input {...register("jobEntry.letter_reference")} placeholder="Letter Reference" className="text-[13px] h-11 rounded-xl bg-slate-50/50 border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Payment Status</label>
                    <Input {...register("jobEntry.payment_status")} placeholder="Payment Status" className="text-[13px] h-11 rounded-xl bg-slate-50/50 border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]" />
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Name for Dispatching the Report</label>
                    <Input {...register("jobEntry.dispatch_name")} placeholder="Dispatch Name" className="text-[13px] h-11 rounded-xl bg-slate-50/50 border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]" />
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Address for Dispatching the Report</label>
                    <textarea
                      {...register("jobEntry.dispatch_address")}
                      placeholder="Dispatch Address"
                      rows={3}
                      className="flex w-full rounded-xl border border-border bg-slate-50/50 px-4 py-2.5 text-[13px] shadow-sm transition-all duration-300 placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 hover:border-orange-500/50 disabled:cursor-not-allowed disabled:opacity-50 text-foreground border-slate-200/80 focus-visible:bg-white min-h-[80px] resize-y"
                    />
                  </div>`;
content = content.replace(oldJobEntryJSX, newJobEntryJSX);

// 7. Remove the "always-on" test inputs for material_id, grade, testing_day, sample_quantity, location, casting date.
// These are in currentStep === 3
const inputsToRemove = [
  /<div className="flex flex-col gap-1\.5">\s*<label className="text-\[13px\] font-semibold text-slate-700 mb-0\.5">MATERIAL ID(?:[\s\S]*?)<\/div>\s*<\/div>/,
  /<div className="flex flex-col gap-1\.5">\s*<label className="text-\[13px\] font-semibold text-slate-700 mb-0\.5">MATERIAL DETAILS \/ Location[\s\S]*?<\/div>/,
  /<div className="flex flex-col gap-1\.5">\s*<label className="text-\[13px\] font-semibold text-slate-700 mb-0\.5">NUMBER OF SAMPLE \/ QTY[\s\S]*?<\/div>/,
  /<div className="flex flex-col gap-1\.5">\s*<label className="text-\[13px\] font-semibold text-slate-700 mb-0\.5">GRADE[\s\S]*?<\/div>/,
  /<div className="flex flex-col gap-1\.5">\s*<label className="text-\[13px\] font-semibold text-slate-700 mb-0\.5">Date of Casting(?:[\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/,
  /<div className="flex flex-col gap-1\.5">\s*<label className="text-\[13px\] font-semibold text-slate-700 mb-0\.5">Testing Day[\s\S]*?<\/div>/
];

// Refined regexes
content = content.replace(/<div className="flex flex-col gap-1\.5">\s*<label className="text-\[13px\] font-semibold text-slate-700 mb-0\.5">MATERIAL ID[\s\S]*?<\/div>/, '');
content = content.replace(/<div className="flex flex-col gap-1\.5">\s*<label className="text-\[13px\] font-semibold text-slate-700 mb-0\.5">MATERIAL DETAILS \/ Location[\s\S]*?<\/div>/, '');
content = content.replace(/<div className="flex flex-col gap-1\.5">\s*<label className="text-\[13px\] font-semibold text-slate-700 mb-0\.5">NUMBER OF SAMPLE \/ QTY[\s\S]*?<\/div>/, '');
content = content.replace(/<div className="flex flex-col gap-1\.5">\s*<label className="text-\[13px\] font-semibold text-slate-700 mb-0\.5">GRADE[\s\S]*?<\/div>/, '');
content = content.replace(/<div className="flex flex-col gap-1\.5">\s*<label className="text-\[13px\] font-semibold text-slate-700 mb-0\.5">Date of Casting[\s\S]*?<\/PremiumDatePicker>\s*<\/div>/, '');
content = content.replace(/<div className="flex flex-col gap-1\.5">\s*<label className="text-\[13px\] font-semibold text-slate-700 mb-0\.5">Testing Day[\s\S]*?<\/div>/, '');

content = content.replace(
  /calculateTestingDate\(currentValues\.date_of_casting \|\| "", val\)/g,
  'calculateTestingDate(currentValues.additional_details_values?.["Date of Casting"] || currentValues.additional_details_values?.["Casting Date"] || "", val)'
);

fs.writeFileSync('src/components/modules/clients/ClientWizard.tsx', content);
console.log("Modifications applied successfully.");
