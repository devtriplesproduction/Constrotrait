import { createClient } from "@/lib/supabase/server";
import { canManageJobAssignments, isHR, isTestEngineer, isSuperAdmin } from "@/config/roles";

const TEST_SELECT = `
  id,
  job_entry_id,
  uid_label,
  ulr_number,
  qc_number,
  report_class,
  date_of_testing,
  test_master ( component_parameter, specific_test, test_method, category, is_nabl, datasheet_qr, material_product, sample_size ),
  job_entries!job_entry_tests_job_entry_id_fkey ( id, uid, uid_label, created_at )
`;

export class JobAssignmentService {
  private static async checkViewPermission(supabase: any) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("roles")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) throw new Error("Failed to verify permissions");
    const roles = profile.roles || [];
    if (!canManageJobAssignments(roles) && !isHR(roles) && !isTestEngineer(roles)) {
      throw new Error("Insufficient permissions to view job assignments");
    }
    return user;
  }

  private static async checkPermission(supabase: any) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("roles")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) throw new Error("Failed to verify permissions");
    if (!canManageJobAssignments(profile.roles)) {
      throw new Error("Insufficient permissions to manage job assignments");
    }
    return user;
  }

  static async getUnassignedJobCards() {
    const supabase = await createClient();
    await this.checkPermission(supabase);

    const { data: tests, error: testsErr } = await supabase
      .from("job_entry_tests")
      .select(`
        id, job_entry_id, date_of_testing, uid_label, test_master_id,
        test_master:test_master_id ( component_parameter, specific_test, category, is_nabl ),
        job_entries!job_entry_tests_job_entry_id_fkey ( id, uid, uid_label )
      `);
    if (testsErr) throw new Error(testsErr.message);

    const { data: assignments, error: asgnErr } = await supabase
      .from("job_assignments")
      .select("job_entry_test_id");
    if (asgnErr) throw new Error(asgnErr.message);

    const assignedIds = new Set(assignments.map((a: any) => a.job_entry_test_id));
    return (tests || []).filter((test: any) => !assignedIds.has(test.id));
  }

  static async getAssignments(filters?: { team_id?: string; employee_id?: string; status?: string }) {
    const supabase = await createClient();
    const user = await this.checkViewPermission(supabase);
    const { data: profile } = await supabase.from("profiles").select("roles, branch_id").eq("id", user.id).single();
    
    let query = supabase
      .from("job_assignments")
      .select(`
        *,
        job_entry_tests!inner ( ${TEST_SELECT} ),
        teams ( id, name, branch_id, team_members(employee_id) ),
        assigned_to_profile:profiles!job_assignments_assigned_to_fkey ( id, first_name, last_name, branch_id ),
        assigned_by_profile:profiles!job_assignments_assigned_by_fkey ( id, first_name, last_name, branch_id )
      `)
      .order("created_at", { ascending: false });
      
    if (filters?.team_id) query = query.eq("team_id", filters.team_id);
    if (filters?.employee_id) query = query.eq("assigned_to", filters.employee_id);
    if (filters?.status) query = query.eq("status", filters.status);
    
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    
    // For branch scope filtering if needed
    let filteredData = data;
    const isSuper = isSuperAdmin(profile?.roles);
    if (!isSuper && profile?.branch_id) {
       filteredData = filteredData.filter((a: any) => {
         // assigned_to matches branch
         if (a.assigned_to_profile?.branch_id === profile.branch_id) return true;
         // assigned_to is null, check assigned_by
         if (!a.assigned_to && a.assigned_by_profile?.branch_id === profile.branch_id) return true;
         // check team members matching branch
         if (a.teams?.branch_id === profile.branch_id) return true;
         
         return false;
       });
    }
    
    return filteredData;
  }

  static async getAssignmentById(id: string) {
    const supabase = await createClient();
    await this.checkViewPermission(supabase);
    
    const { data, error } = await supabase
      .from("job_assignments")
      .select(`
        *,
        job_entry_tests!inner ( ${TEST_SELECT} ),
        teams ( id, name, branch_id, team_members(employee_id) ),
        assigned_to_profile:profiles!job_assignments_assigned_to_fkey ( id, first_name, last_name, branch_id ),
        assigned_by_profile:profiles!job_assignments_assigned_by_fkey ( id, first_name, last_name, branch_id )
      `)
      .eq("id", id)
      .single();
      
    if (error) throw new Error(error.message);
    return data;
  }

  static async getMyAssignments(_userId?: string) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");
    const { data: userTeams } = await supabase.from("team_members").select("team_id").eq("employee_id", user.id);
    const teamIds = userTeams?.map((t: any) => t.team_id) || [];
    let query = supabase
      .from("job_assignments")
      .select(`
        *,
        job_entry_tests!inner ( ${TEST_SELECT} ),
        teams ( id, name, team_members(employee_id) ),
        assigned_to_profile:profiles!job_assignments_assigned_to_fkey ( id, first_name, last_name ),
        assigned_by_profile:profiles!job_assignments_assigned_by_fkey ( id, first_name, last_name )
      `)
      .order("created_at", { ascending: false });
    if (teamIds.length > 0) query = query.or(`assigned_to.eq.${user.id},team_id.in.(${teamIds.join(",")})`);
    else query = query.eq("assigned_to", user.id);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }

  static async assignJobCard(data: {
    job_entry_test_id: string;
    team_id?: string;
    assigned_to?: string;
    due_date?: string;
    notes?: string;
  }) {
    const supabase = await createClient();
    const user = await this.checkPermission(supabase);
    if (!data.team_id && !data.assigned_to) {
      throw new Error("Must provide either a team_id or an assigned_to employee.");
    }

    let actualJobEntryTestId = data.job_entry_test_id;

    const { data: testRow, error: testErr } = await supabase
      .from("job_entry_tests").select("id, job_entry_id").eq("id", actualJobEntryTestId).single();
    if (testErr || !testRow) throw new Error("Job card test not found");



    const { data: existing, error: existingError } = await supabase
      .from("job_assignments").select("id").eq("job_entry_test_id", actualJobEntryTestId).maybeSingle();
    if (existingError) throw new Error("Error checking existing assignments");

    const payload = {
      team_id: data.team_id || null,
      assigned_to: data.assigned_to || null,
      assigned_by: user.id,
      due_date: data.due_date,
      notes: data.notes,
      status: "assigned",
    };

    if (existing) {
      const { data: updated, error } = await supabase.from("job_assignments")
        .update({ ...payload, updated_at: new Date().toISOString() }).eq("id", existing.id).select().single();
      if (error) throw new Error(error.message);
      return updated;
    }

    const { data: inserted, error } = await supabase.from("job_assignments")
      .insert([{ job_entry_test_id: actualJobEntryTestId, ...payload }]).select().single();
    if (error) throw new Error(error.message);
    return inserted;
  }

  static async updateAssignmentStatus(id: string, status: string, payload?: { report_url?: string; reviewer_remark?: string }) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");
    const { data: profile, error: profileError } = await supabase.from("profiles").select("roles").eq("id", user.id).single();
    if (profileError || !profile) throw new Error("Failed to verify permissions");
    const isManager = canManageJobAssignments(profile.roles);
    const { data: assignment, error: assignmentError } = await supabase
      .from("job_assignments")
      .select("*, teams(team_members(employee_id)), job_entry_tests ( id, job_entry_id )")
      .eq("id", id).single();
    if (assignmentError || !assignment) throw new Error("Assignment not found");
    let canUpdate = isManager;
    if (!canUpdate) {
      if (assignment.assigned_to === user.id) canUpdate = true;
      else if (assignment.teams?.team_members?.some((m: any) => m.employee_id === user.id)) canUpdate = true;
    }
    if (!canUpdate) throw new Error("Insufficient permissions to update this assignment");

    const { canTransition } = await import("@/config/jobTransitions");
    
    let actualStatus = status;
    if (status === 'report_uploaded' && payload?.report_url) {
      actualStatus = 'in_review';
    }

    if (!canTransition(assignment.status as any, actualStatus as any, profile.roles)) {
      throw new Error(`Invalid state transition from ${assignment.status} to ${actualStatus}`);
    }
    
    if (actualStatus === 'rejected' && (!payload?.reviewer_remark || payload.reviewer_remark.trim() === '')) {
      throw new Error("A reviewer remark is required when rejecting a job.");
    }
    
    const updateData: any = { status: actualStatus };
    if (payload?.report_url !== undefined) updateData.report_url = payload.report_url;
    if (payload?.reviewer_remark !== undefined) updateData.reviewer_remark = payload.reviewer_remark;

    const { data, error } = await supabase.from("job_assignments").update(updateData).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async deleteAssignment(id: string) {
    const supabase = await createClient();
    const user = await this.checkPermission(supabase);
    
    const { error } = await supabase.from("job_assignments").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  }
}
