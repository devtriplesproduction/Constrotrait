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
  test_master_id: z.string().min(1, "Test must be selected"),
  test_name: z.string().optional(), // For UI purposes
  test_method: z.string().optional(), // Auto-filled from test master
  material_id: z.string().min(1, "Material ID is required"),
  material_details_location: z.string().optional(),
  sample_quantity: z.string().optional(),
  grade: z.string().optional(),
  testing_day: z.string().optional(),
  additional_details_values: z.record(z.string(), z.string()).optional(),
});

export type TestDetailsValues = z.infer<typeof testDetailsSchema>;

export const clientWizardSchema = z.object({
  client: clientDetailsSchema,
  selectedTests: z.array(z.string().uuid()).min(1, "Select at least one test"),
  jobEntryTests: z.array(testDetailsSchema).min(1, "Provide details for at least one test"),
});

export type ClientWizardValues = z.infer<typeof clientWizardSchema>;
