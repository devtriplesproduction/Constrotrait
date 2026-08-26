import * as z from "zod";

export const holidayFormSchema = z.object({
  name: z.string().min(2, "Holiday name is required"),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
  department: z.string().optional(),
  branch_id: z.string().optional(),
}).refine(data => data.department || data.branch_id, {
  message: "A holiday must apply to either a branch or a department",
  path: ["department"], // This applies the error to the department field by default
});

export type HolidayFormData = z.infer<typeof holidayFormSchema>;
