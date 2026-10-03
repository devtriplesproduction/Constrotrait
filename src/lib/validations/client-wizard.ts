import { z } from "zod";

export const clientDetailsSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name of Customer is required"),
  company_name: z.string().optional(),
  address: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  gst_no: z.string().optional(),
});

export type ClientDetailsValues = z.infer<typeof clientDetailsSchema>;

export const jobEntryDetailsSchema = z.object({
  division: z.string().optional(),
  site_name: z.string().optional(),
  agency_name: z.string().optional(),
  project_name: z.string().optional(),
  dispatch_name: z.string().optional(),
  dispatch_address: z.string().optional(),
  contact_person: z.string().optional(),
  collected_by: z.string().optional(),
  invoice_no: z.string().optional(),
  invoice_date: z.string().optional(),
  letter_reference: z.string().optional(),
  payment_status: z.string().optional(),
});

export type JobEntryDetailsValues = z.infer<typeof jobEntryDetailsSchema>;

export const testDetailsSchema = z.object({
  test_master_id: z.string().optional().or(z.literal("")),
  test_name: z.string().optional(), // For UI purposes
  test_method: z.string().optional(), // Auto-filled from test master
  testing_age: z.string().optional(),
  date_of_testing: z.string().optional(),
  material_description: z.string().optional(),
  material_id: z.string().optional(),
  material_details_location: z.string().optional(),
  sample_quantity: z.string().optional(),
  testing_day: z.string().optional(),
  grade: z.string().optional(),
  date_of_casting: z.string().optional(),
  date_of_receiving: z.string().optional(),
  additional_details_values: z.record(z.string(), z.string()).optional(),
});

export type TestDetailsValues = z.infer<typeof testDetailsSchema>;

export const materialDetailsSchema = z.object({
  material_id: z.string().optional(),
  material_details_location: z.string().optional(),
  sample_quantity: z.string().optional(),
  testing_day: z.string().optional(),
  grade: z.string().optional(),
  date_of_casting: z.string().optional(),
  date_of_receiving: z.string().optional(),
});
export type MaterialDetailsValues = z.infer<typeof materialDetailsSchema>;

export const clientWizardSchema = z.object({
  client: clientDetailsSchema,
  jobEntry: jobEntryDetailsSchema.default({}),
  materialDetails: materialDetailsSchema.default({}),
  selectedTestIds: z.array(z.string()).default([]),
  jobEntryTests: z.array(testDetailsSchema).default([]),
  dummy_is_nabl: z.boolean().optional(),
});

export type ClientWizardValues = z.infer<typeof clientWizardSchema>;
