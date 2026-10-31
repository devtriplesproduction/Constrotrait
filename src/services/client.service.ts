import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";
import { getAuthenticatedUserWithRoles } from "./auth.service";
import { canManageClientsAndJobs, isSuperAdmin, canManageAccountingTransactions } from "@/config/roles";

export class ClientService {
  /**
   * Search for clients by name, email, mobile, or GST with branch scoping
   */
  static async searchClients(query: string, branchId?: string) {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    
    // Sanitize the query to avoid PostgREST syntax errors with commas, parentheses, etc.
    const sanitized = query.replace(/[,()\\%]/g, ' ').trim();
    const words = sanitized.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return [];

    const phrase = words.join(' ');
    
    let dbQuery = supabase
      .from("clients")
      .select("*, branches ( id, name, code )")
      .or(`name.ilike.%${phrase}%,company_name.ilike.%${phrase}%,email.ilike.%${phrase}%,mobile.ilike.%${phrase}%,gst_no.ilike.%${phrase}%`)
      .limit(50);

    const isSuper = isSuperAdmin(user.roles);
    if (branchId && branchId !== "all") {
      dbQuery = dbQuery.eq("branch_id", branchId);
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error("Error searching clients:", error);
      throw new Error(error.message);
    }

    if (data && data.length > 0) {
      return data;
    }

    // Fallback for multi-word or reordered queries (e.g. "Ketan Ankita" or "Khandagale Ketan")
    if (words.length > 1) {
      const firstWord = words[0];
      let fallbackQuery = supabase
        .from("clients")
        .select("*, branches ( id, name, code )")
        .or(`name.ilike.%${firstWord}%,company_name.ilike.%${firstWord}%,email.ilike.%${firstWord}%,mobile.ilike.%${firstWord}%,gst_no.ilike.%${firstWord}%`)
        .limit(50);

      if (branchId && branchId !== "all") {
        fallbackQuery = fallbackQuery.eq("branch_id", branchId);
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;
      if (!fallbackError && fallbackData) {
        const remaining = words.slice(1).map(w => w.toLowerCase());
        const filtered = fallbackData.filter(client => {
          const text = `${client.name || ''} ${client.company_name || ''} ${client.email || ''} ${client.mobile || ''} ${client.gst_no || ''}`.toLowerCase();
          return remaining.every(w => text.includes(w));
        });
        if (filtered.length > 0) return filtered;
      }
    }

    return data || [];
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
    if (!canManageClientsAndJobs(user.roles) && !canManageAccountingTransactions(user.roles)) {
      throw new Error("Unauthorized: You do not have permission to manage clients");
    }

    const supabase = await createClient();
    const isSuper = isSuperAdmin(user.roles);
    let branchId = isSuper ? (clientData.branch_id || user.branch_id) : user.branch_id;
    if (!branchId) {
      const { data: fallbackBranch } = await supabase.from("branches").select("id").limit(1).maybeSingle();
      branchId = fallbackBranch?.id || null;
    }
    if (!branchId) {
      throw new Error("A valid branch must be assigned to create a client.");
    }

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
    if (!canManageClientsAndJobs(user.roles) && !canManageAccountingTransactions(user.roles)) {
      throw new Error("Unauthorized: You do not have permission to manage clients");
    }

    const supabase = await createClient();
    const isSuper = isSuperAdmin(user.roles);

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

  /**
   * Fetch unique projects for a given client
   */
  static async getClientProjects(clientId: string) {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("job_entries")
      .select("project_name, site_name, contact_person, division, agency, dispatch_name, dispatch_address, collected_by, invoice_no, invoice_date, letter_reference, payment_status")
      .eq("client_id", clientId)
      .not("project_name", "is", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching client projects:", error);
      throw new Error("Failed to fetch client projects");
    }

    const uniqueProjects = Array.from(
      new Map(
        (data || [])
          .filter((d) => d.project_name && d.project_name.trim().length > 0)
          .map((item) => [item.project_name.trim().toLowerCase(), item])
      ).values()
    );

    // Also check if clients table has project/site/contact details
    const { data: clientData } = await supabase
      .from("clients")
      .select("project_name, site_name, contact_person, division, agency_name, dispatch_name, dispatch_address, collected_by")
      .eq("id", clientId)
      .maybeSingle();

    if (clientData) {
      if (clientData.project_name && clientData.project_name.trim().length > 0) {
        const key = clientData.project_name.trim().toLowerCase();
        const existing = uniqueProjects.find((p) => p.project_name.trim().toLowerCase() === key);
        if (!existing) {
          uniqueProjects.push({
            project_name: clientData.project_name.trim(),
            site_name: clientData.site_name || "",
            contact_person: clientData.contact_person || "",
            division: clientData.division || "",
            agency: clientData.agency_name || "",
            dispatch_name: clientData.dispatch_name || "",
            dispatch_address: clientData.dispatch_address || "",
            collected_by: clientData.collected_by || "",
            invoice_no: "",
            invoice_date: null,
            letter_reference: "",
            payment_status: "",
          } as any);
        }
      }

      // Backfill any empty fields in uniqueProjects using clientData as fallback
      for (const p of uniqueProjects) {
        if (!p.site_name && clientData.site_name) p.site_name = clientData.site_name;
        if (!p.contact_person && clientData.contact_person) p.contact_person = clientData.contact_person;
        if (!p.agency && clientData.agency_name) p.agency = clientData.agency_name;
        if (!p.division && clientData.division) p.division = clientData.division;
        if (!p.dispatch_name && clientData.dispatch_name) p.dispatch_name = clientData.dispatch_name;
        if (!p.dispatch_address && clientData.dispatch_address) p.dispatch_address = clientData.dispatch_address;
        if (!p.collected_by && clientData.collected_by) p.collected_by = clientData.collected_by;
      }
    }

    return uniqueProjects;
  }
}
