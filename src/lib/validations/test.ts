import { z } from "zod";

export const createTestSchema = z.object({
  serial_no: z.string().optional(),
  discipline_group: z.string().min(1, "Discipline / Group is required"),
  material_product: z.string().min(1, "Materials or Products tested is required"),
  component_parameter: z.string().min(1, "Component, parameter or characteristic tested is required"),
  specific_test: z.string().optional(),
  test_method: z.string().min(1, "Test Method Specification is required"),
  technique_equipment: z.string().optional(),
  is_nabl: z.boolean({ required_error: "Accreditation is required" }),
  category: z.enum(["Construction", "Environmental"], { required_error: "Category is required" }),
  additional_details: z.array(z.string()).optional(),
  report_qr: z.string().optional().or(z.literal("")),
  datasheet_qr: z.string().nullable().optional(),
});

export type CreateTestInput = z.infer<typeof createTestSchema>;
