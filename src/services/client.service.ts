import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";

export class ClientService {
  /**
   * Search for clients by name, email, mobile, or GST
   */
  static async searchClients(query: string) {
    const supabase = await createClient();
    
    // We can use an 'or' filter for search
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,mobile.ilike.%${query}%,gst_no.ilike.%${query}%`)
      .limit(10);

    if (error) {
      console.error("Error searching clients:", error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Get client by ID
   */
  static async getClientById(id: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching client:", error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Create a new client
   */
  static async createClient(clientData: Database["public"]["Tables"]["clients"]["Insert"]) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("clients")
      .insert(clientData)
      .select()
      .single();

    if (error) {
      console.error("Error creating client:", error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Update an existing client
   */
  static async updateClient(id: string, clientData: Database["public"]["Tables"]["clients"]["Update"]) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("clients")
      .update(clientData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating client:", error);
      throw new Error(error.message);
    }

    return data;
  }
}
