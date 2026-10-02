const fs = require('fs');

let content = fs.readFileSync('src/components/modules/clients/ClientWizard.tsx', 'utf8');

// Replace defaultValues section exactly:
content = content.replace(
  /client: \{\s*id: initialData\.client\.id,[\s\S]*?gst_no: initialData\.client\.gst_no \|\| "",\s*\}/,
  `client: {
        id: initialData.client.id,
        name: initialData.client.name || "",
        company_name: initialData.client.company_name || "",
        address: initialData.client.address || "",
        mobile: initialData.client.mobile || "",
        email: initialData.client.email || "",
        gst_no: initialData.client.gst_no || "",
      },
      jobEntry: {
        division: initialData.jobEntryTest.job_entries?.division || "",
        site_name: initialData.jobEntryTest.job_entries?.site_name || "",
        agency_name: initialData.jobEntryTest.job_entries?.agency || "",
        project_name: initialData.jobEntryTest.job_entries?.project_name || "",
        dispatch_name: initialData.jobEntryTest.job_entries?.dispatch_name || "",
        dispatch_address: initialData.jobEntryTest.job_entries?.dispatch_address || "",
        contact_person: initialData.jobEntryTest.job_entries?.contact_person || "",
        collected_by: initialData.jobEntryTest.job_entries?.collected_by || "",
        invoice_no: initialData.jobEntryTest.job_entries?.invoice_no || "",
        invoice_date: initialData.jobEntryTest.job_entries?.invoice_date || "",
        letter_reference: initialData.jobEntryTest.job_entries?.letter_reference || "",
        payment_status: initialData.jobEntryTest.job_entries?.payment_status || "",
      }`
);

// We need to also add empty jobEntry to the `} : {` fallback.
content = content.replace(
  /\} : \{\s*client: \{/,
  `} : {
      jobEntry: {},
      client: {`
);

// We also have errors around passing "client.division" etc in ClientWizard.tsx.
// Let's replace any `client.division`, `client.site_name`, `client.agency_name` to `jobEntry.division` etc.
// But wait, the previous edit already changed the Inputs from `client.xyz` to `jobEntry.xyz` inside the Job Entry Details block!
// Ah, the errors are about:
// Argument of type '"client.division"' is not assignable to parameter of type '"client" | "jobEntry" | ...
// Wait! Those errors might be from somewhere else, maybe the handleSelectClient function?

fs.writeFileSync('src/components/modules/clients/ClientWizard.tsx', content);
console.log("Modifications applied successfully.");
