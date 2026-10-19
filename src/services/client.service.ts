import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";
import { getAuthenticatedUserWithRoles } from "./auth.service";
import { canManageClientsAndJobs, isSuperAdmin } from "@/config/roles";

export class ClientService {
  /**
   * Search for clients by name, email, mobile, or GST with branch scoping
   */
  static async searchClients(query: string, branchId?: string) {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    
    // Sanitize the query to escape commas and percent signs
    const sanitizedQuery = query.replace(/,/g, '\\,').replace(/%/g, '\\%');
    
    let dbQuery = supabase
      .from("clients")
      .select("*, branches ( id, name, code )")
      .or(`name.ilike.%${sanitizedQuery}%,company_name.ilike.%${sanitizedQuery}%,email.ilike.%${sanitizedQuery}%,mobile.ilike.%${sanitizedQuery}%,gst_no.ilike.%${sanitizedQuery}%`)
      .limit(50);

    const isSuper = isSuperAdmin(user.roles);
    if (isSuper) {
      if (branchId && branchId !== "all") {
        dbQuery = dbQuery.eq("branch_id", branchId);
      }
    } else {
      if (user.branch_id) {
        dbQuery = dbQuery.eq("branch_id", user.branch_id);
      } else {
        return [];
      }
    }

    const { data, error } = await dbQuery;

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
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("clients")
      .select("*, branches ( id, name, code )")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching client:", error);
      throw new Error(error.message);
    }

    const isSuper = isSuperAdmin(user.roles);
    if (!isSuper && data.branch_id && data.branch_id !== user.branch_id) {
      throw new Error("Unauthorized: Cross-branch client access is not permitted");
    }

    return data;
  }

  /**
   * Create a new client with branch scoping
   */
  static async createClient(clientData: Database["public"]["Tables"]["clients"]["Insert"]) {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");
    if (!canManageClientsAndJobs(user.roles)) throw new Error("Unauthorized: You do not have permission to manage clients");

    const isSuper = isSuperAdmin(user.roles);
    const branchId = isSuper ? (clientData.branch_id || user.branch_id) : user.branch_id;
    if (!branchId) {
      throw new Error("A valid branch must be assigned to create a client.");
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("clients")
      .insert({
        ...clientData,
        branch_id: branchId,
        created_by: user.id,
        updated_by: user.id,
      })
      .select("*, branches ( id, name, code )")
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
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");
    if (!canManageClientsAndJobs(user.roles)) throw new Error("Unauthorized: You do not have permission to manage clients");

    const supabase = await createClient();
    const isSuper = isSuperAdmin(user.roles);

    if (!isSuper) {
      const { data: existing } = await supabase.from("clients").select("branch_id").eq("id", id).single();
      if (existing && existing.branch_id !== user.branch_id) {
        throw new Error("Unauthorized: Cross-branch client editing is not permitted");
      }
    }

    const updatePayload: any = {
      ...clientData,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };

    if (!isSuper) {
      delete updatePayload.branch_id;
    }

    const { data, error } = await supabase
      .from("clients")
      .update(updatePayload)
      .eq("id", id)
      .select("*, branches ( id, name, code )")
      .single();

    if (error) {
      console.error("Error updating client:", error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Get all clients with branch scoping
   */
  static async getAllClients(branchId?: string) {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    let query = supabase
      .from("clients")
      .select("*, branches ( id, name, code )")
      .order("name", { ascending: true });

    const isSuper = isSuperAdmin(user.roles);
    if (isSuper) {
      if (branchId && branchId !== "all") {
        query = query.eq("branch_id", branchId);
      }
    } else {
      if (user.branch_id) {
        query = query.eq("branch_id", user.branch_id);
      } else {
        return [];
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching clients:", error);
      throw new Error(error.message);
    }

    return data;
  }
}
