import { createClient } from "@/lib/supabase/client";
import { CreateTestInput } from "@/lib/validations/test";

export const testService = {
  async createTestMaster(data: CreateTestInput) {
    const supabase = createClient();
    
    // We assume the user is authenticated; user_id will be handled by auth logic or trigger if needed.
    // Right now, created_by and updated_by might need to be set from the auth user context.
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    const { data: testData, error } = await supabase
      .from("test_master")
      .insert({
        serial_no: data.serial_no,
        discipline_group: data.discipline_group,
        material_product: data.material_product,
        component_parameter: data.component_parameter,
        specific_test: data.specific_test,
        test_method: data.test_method,
        technique_equipment: data.technique_equipment,
        is_nabl: data.is_nabl,
        category: data.category,
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating test master:", error);
      throw new Error(error.message);
    }

    return testData;
  },

  async getTests() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("test_master")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching tests:", error);
      throw new Error(error.message);
    }

    return data;
  }
};
