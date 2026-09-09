import * as z from "zod";

export const branchSchema = z.object({
  name: z.string().trim().min(1, "Branch name is required"),
  code: z.string().trim().min(1, "Branch code is required"),
  address: z.string().trim().optional(),
  email: z.string().trim().email("Invalid email format").optional().or(z.literal("")),
  phone: z.string().trim().max(10, "Phone number cannot exceed 10 characters").optional(),
  gst_number: z.string().trim().max(15, "GST number cannot exceed 15 characters").optional(),
  is_active: z.boolean(),
});

export type BranchFormData = z.infer<typeof branchSchema>;
