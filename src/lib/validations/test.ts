import { z } from "zod";

export const createTestSchema = z.object({
  serial_no: z.string().optional(),
  discipline_group: z.string().optional(),
  material_product: z.string().optional(),
  component_parameter: z.string().optional(),
  specific_test: z.string().optional(),
  test_method: z.string().optional(),
  technique_equipment: z.string().optional(),
  is_nabl: z.boolean({ required_error: "Accreditation is required" }),
  category: z.enum(["Construction", "Environmental"], { required_error: "Category is required" }),
  additional_details: z.array(z.string()).optional(),
  report_qr: z.string().optional().or(z.literal("")),
  datasheet_qr: z.string().nullable().optional(),

  particulars: z.string().optional(),
  unit: z.string().optional(),
  sample_size: z.string().optional(),
  minimum_value: z.string().optional(),
  time_required: z.string().optional(),
  tested_as_per_is: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.is_nabl) {
    if (!data.discipline_group) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Test Name is required", path: ["discipline_group"] });
    if (!data.material_product) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Materials or Products tested is required", path: ["material_product"] });
    if (!data.component_parameter) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Component / parameter is required", path: ["component_parameter"] });
    if (!data.test_method) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Test Method Specification is required", path: ["test_method"] });
    if (!data.report_qr) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Report QR is required", path: ["report_qr"] });
  } else {
    if (!data.particulars) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Particulars is required", path: ["particulars"] });
    if (!data.unit) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Unit is required", path: ["unit"] });
    if (!data.sample_size) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Sample size is required", path: ["sample_size"] });
    if (!data.minimum_value) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Minimum is required", path: ["minimum_value"] });
    if (!data.time_required) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Time is required", path: ["time_required"] });
    if (!data.tested_as_per_is) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tested As Per Indian Standard is required", path: ["tested_as_per_is"] });
    if (!data.report_qr) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Report QR is required", path: ["report_qr"] });
  }
});

export type CreateTestInput = z.infer<typeof createTestSchema>;
