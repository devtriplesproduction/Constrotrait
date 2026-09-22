import { z } from "zod";

export const clientDetailsSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name of Customer is required"),
  address: z.string().optional(),
  division: z.string().optional(),
  site_name: z.string().optional(),
  agency_name: z.string().optional(),
  project_name: z.string().optional(),
  dispatch_name: z.string().optional(),
  dispatch_address: z.string().optional(),
  contact_person: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  collected_by: z.string().optional(),
  gst_no: z.string().optional(),
});

export type ClientDetailsValues = z.infer<typeof clientDetailsSchema>;

export const testDetailsSchema = z.object({
  test_master_id: z.string().optional().or(z.literal("")),
  test_name: z.string().optional(), // For UI purposes
  test_method: z.string().optional(), // Auto-filled from test master
  material_id: z.string().optional().or(z.literal("")),
  material_details_location: z.string().optional(),
  sample_quantity: z.string().optional(),
  grade: z.string().optional(),
  testing_day: z.string().optional(),
  date_of_receiving: z.string().optional(),
  date_of_casting: z.string().optional(),
  testing_age: z.string().optional(),
  date_of_testing: z.string().optional(),
  material_description: z.string().optional(),
  additional_details_values: z.record(z.string(), z.string()).optional(),
});

export type TestDetailsValues = z.infer<typeof testDetailsSchema>;

export const clientWizardSchema = z.object({
  client: clientDetailsSchema,
  selectedTestId: z.string().optional().or(z.literal("")),
  jobEntryTest: testDetailsSchema,
});

export type ClientWizardValues = z.infer<typeof clientWizardSchema>;
