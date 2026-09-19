import { z } from "zod";

export const createTestSchema = z.object({
  serial_no: z.string().optional(),
  discipline_group: z.string().min(1, "Discipline / Group is required"),
  material_product: z.string().min(1, "Materials or Products tested is required"),
  component_parameter: z.string().min(1, "Component, parameter or characteristic tested is required"),
  specific_test: z.string().optional(),
  test_method: z.string().min(1, "Test Method Specification is required"),
  technique_equipment: z.string().optional(),
  is_nabl: z.boolean().optional(),
  category: z.enum(["Construction", "Environmental"]).optional(),
  additional_details: z.array(z.string()).optional(),
});

export type CreateTestInput = z.infer<typeof createTestSchema>;
