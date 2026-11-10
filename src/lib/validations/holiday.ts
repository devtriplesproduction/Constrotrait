import * as z from "zod";

export const holidayFormSchema = z
  .object({
    name: z.string().min(2, "Holiday name is required"),
    isRange: z.boolean().optional(),
    date: z.string().min(1, "Date is required"),
    endDate: z.string().optional(),
    description: z.string().optional(),
    departments: z.array(z.string()).optional(),
    branches: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      const hasDept = data.departments && data.departments.length > 0;
      const hasBranch = data.branches && data.branches.length > 0;
      return hasDept || hasBranch;
    },
    {
      message: "A holiday must apply to either a branch or a department",
      path: ["branches"],
    }
  )
  .refine(
    (data) => {
      if (data.isRange && !data.endDate) {
        return false;
      }
      return true;
    },
    {
      message: "End date is required for date range",
      path: ["endDate"],
    }
  )
  .refine(
    (data) => {
      if (data.isRange && data.date && data.endDate) {
        return data.endDate >= data.date;
      }
      return true;
    },
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    }
  );

export type HolidayFormData = z.infer<typeof holidayFormSchema>;

