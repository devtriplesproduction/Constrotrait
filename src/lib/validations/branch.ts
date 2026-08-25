import * as z from "zod";

export const branchSchema = z.object({
  name: z.string().trim().min(1, "Branch name is required"),
  code: z.string().trim().min(1, "Branch code is required"),
  address: z.string().trim().optional(),
  is_active: z.boolean(),
});

export type BranchFormData = z.infer<typeof branchSchema>;
