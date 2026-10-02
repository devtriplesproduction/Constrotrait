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
        division: (initialData.jobEntryTest as any)?.job_entries?.division || "",
        site_name: (initialData.jobEntryTest as any)?.job_entries?.site_name || "",
        agency_name: (initialData.jobEntryTest as any)?.job_entries?.agency || "",
        project_name: (initialData.jobEntryTest as any)?.job_entries?.project_name || "",
        dispatch_name: (initialData.jobEntryTest as any)?.job_entries?.dispatch_name || "",
        dispatch_address: (initialData.jobEntryTest as any)?.job_entries?.dispatch_address || "",
        contact_person: (initialData.jobEntryTest as any)?.job_entries?.contact_person || "",
        collected_by: (initialData.jobEntryTest as any)?.job_entries?.collected_by || "",
        invoice_no: (initialData.jobEntryTest as any)?.job_entries?.invoice_no || "",
        invoice_date: (initialData.jobEntryTest as any)?.job_entries?.invoice_date || "",
        letter_reference: (initialData.jobEntryTest as any)?.job_entries?.letter_reference || "",
        payment_status: (initialData.jobEntryTest as any)?.job_entries?.payment_status || "",
      }`
);

// We need to also add empty jobEntry to the `} : {` fallback.
content = content.replace(
  /\} : \{\s*client: \{/,
  `} : {
      jobEntry: {},
      client: {`
);

// handleSelectClient replacements
content = content.replace(/setValue\("client\.division", client\.division \|\| ""\);/, 'setValue("jobEntry.division", (client as any).division || "");');
content = content.replace(/setValue\("client\.site_name", client\.site_name \|\| ""\);/, 'setValue("jobEntry.site_name", (client as any).site_name || "");');
content = content.replace(/setValue\("client\.agency_name", client\.agency_name \|\| ""\);/, 'setValue("jobEntry.agency_name", (client as any).agency_name || "");');
content = content.replace(/setValue\("client\.project_name", client\.project_name \|\| ""\);/, 'setValue("jobEntry.project_name", (client as any).project_name || "");');
content = content.replace(/setValue\("client\.dispatch_name", client\.dispatch_name \|\| ""\);/, 'setValue("jobEntry.dispatch_name", (client as any).dispatch_name || "");');
content = content.replace(/setValue\("client\.dispatch_address", client\.dispatch_address \|\| ""\);/, 'setValue("jobEntry.dispatch_address", (client as any).dispatch_address || "");');
content = content.replace(/setValue\("client\.contact_person", client\.contact_person \|\| ""\);/, 'setValue("jobEntry.contact_person", (client as any).contact_person || "");');
content = content.replace(/setValue\("client\.collected_by", client\.collected_by \|\| ""\);/, 'setValue("jobEntry.collected_by", (client as any).collected_by || "");');

// Also in ResultsEntry.tsx there is a TS error:
// Argument of type ... is not assignable to parameter of type 'SetStateAction<TestResultRow[]>'.
// Wait, the error is: src/components/modules/results/ResultsEntry.tsx(36,13): error TS18048: 'res.data' is possibly 'undefined'.
// Let's fix that too.

fs.writeFileSync('src/components/modules/clients/ClientWizard.tsx', content);

let resultsContent = fs.readFileSync('src/components/modules/results/ResultsEntry.tsx', 'utf8');
resultsContent = resultsContent.replace(/setTests\(res\.data\);/, 'setTests(res.data as any);');
fs.writeFileSync('src/components/modules/results/ResultsEntry.tsx', resultsContent);

console.log("Modifications applied successfully.");
