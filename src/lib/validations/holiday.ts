import * as z from "zod";

export const holidayFormSchema = z.object({
  name: z.string().min(2, "Holiday name is required"),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
  departments: z.array(z.string()).optional(),
  branches: z.array(z.string()).optional(),
}).refine(data => {
  const hasDept = data.departments && data.departments.length > 0;
  const hasBranch = data.branches && data.branches.length > 0;
  return hasDept || hasBranch;
}, {
  message: "A holiday must apply to either a branch or a department",
  path: ["branches"], 
});

export type HolidayFormData = z.infer<typeof holidayFormSchema>;
