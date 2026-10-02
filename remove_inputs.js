const fs = require('fs');

let content = fs.readFileSync('src/components/modules/clients/ClientWizard.tsx', 'utf8');

// 1. Remove specific blocks carefully by replacing the exact substring to avoid regex greedy match issues.
const inputs = [
  `<div className="flex flex-col gap-1.5">\n                                <label className="text-[13px] font-semibold text-slate-700 mb-0.5">MATERIAL ID <span className="text-red-500">*</span></label>\n                                <Input {...register(\`jobEntryTests.\${index}.material_id\`)} placeholder="Material ID" />\n                                {errors.jobEntryTests?.[index]?.material_id && <p className="text-red-500 text-xs">{errors.jobEntryTests[index]?.material_id?.message}</p>}\n                              </div>`,
  `<div className="flex flex-col gap-1.5">\n                                <label className="text-[13px] font-semibold text-slate-700 mb-0.5">MATERIAL DETAILS / Location</label>\n                                <Input {...register(\`jobEntryTests.\${index}.material_details_location\`)} placeholder="Location / Details" />\n                              </div>`,
  `<div className="flex flex-col gap-1.5">\n                                <label className="text-[13px] font-semibold text-slate-700 mb-0.5">NUMBER OF SAMPLE / QTY</label>\n                                <Input {...register(\`jobEntryTests.\${index}.sample_quantity\`)} placeholder="Quantity" />\n                              </div>`,
  `<div className="flex flex-col gap-1.5">\n                                <label className="text-[13px] font-semibold text-slate-700 mb-0.5">GRADE</label>\n                                <Input {...register(\`jobEntryTests.\${index}.grade\`)} placeholder="Grade" />\n                              </div>`,
  `<div className="flex flex-col gap-1.5">\n                                <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Testing Day</label>\n                                <Input {...register(\`jobEntryTests.\${index}.testing_day\`)} placeholder="Testing Day" />\n                              </div>`,
  `<div className="flex flex-col gap-1.5">\n                                <label className="text-[13px] font-semibold text-slate-700 mb-0.5">Date of Casting</label>\n                                <PremiumDatePicker\n                                  value={watch(\`jobEntryTests.\${index}.date_of_casting\`)}\n                                  onChange={(val) => {\n                                    setValue(\`jobEntryTests.\${index}.date_of_casting\`, val, { shouldValidate: true });\n                                    const currentValues = getValues(\`jobEntryTests.\${index}\`);\n                                    const newTestingDate = calculateTestingDate(val, currentValues.testing_age || "");\n                                    setValue(\`jobEntryTests.\${index}.date_of_testing\`, newTestingDate, { shouldValidate: true });\n                                  }}\n                                  side="left"\n                                />\n                              </div>`
];

inputs.forEach(input => {
  content = content.replace(input, '');
});

// Update calculateTestingDate
content = content.replace(
  /calculateTestingDate\(currentValues\.date_of_casting \|\| "", val\)/g,
  'calculateTestingDate(currentValues.additional_details_values?.["Date of Casting"] || currentValues.additional_details_values?.["Casting Date"] || "", val)'
);

fs.writeFileSync('src/components/modules/clients/ClientWizard.tsx', content);
console.log("Inputs removed exactly.");
