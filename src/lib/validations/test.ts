import { z } from "zod";

export const createTestSchema = z.object({
  serial_no: z.string().min(1, "S.No is required"),
  discipline_group: z.string().min(1, "Discipline / Group is required"),
  material_product: z.string().min(1, "Material / Product is required"),
  component_parameter: z.string().min(1, "Component / Parameter is required"),
  specific_test: z.string().min(1, "Specific Test is required"),
  test_method: z.string().min(1, "Test Method Specification is required"),
  technique_equipment: z.string().min(1, "Technique / Equipment is required"),
  is_nabl: z.boolean(),
  category: z.enum(["Construction", "Environmental"], {
    required_error: "Category is required",
  }),
});

export type CreateTestInput = z.infer<typeof createTestSchema>;
