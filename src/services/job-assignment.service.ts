import { createClient } from "@/lib/supabase/server";
import { canManageJobAssignments } from "@/config/roles";

const TEST_SELECT = `
  id,
  job_entry_id,
  ulr_number,
  qc_number,
  report_class,
  test_master ( component_parameter, specific_test, test_method, category, is_nabl ),
  job_entries ( id, uid )
`;

export class JobAssignmentService {
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

    const { data, error } = await supabase
      .from("job_entry_tests")
      .select(`${TEST_SELECT}, job_assignments ( id )`);

    if (error) {
      console.error("Error fetching unassigned job cards:", error);
      throw new Error(error.message);
    }

    return (data || []).filter((test: any) => !test.job_assignments || test.job_assignments.length === 0);
  }

  static async getAssignments(filters?: { team_id?: string; employee_id?: string; status?: string }) {
    const supabase = await createClient();
    await this.checkPermission(supabase);

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

    if (filters?.team_id) query = query.eq("team_id", filters.team_id);
    if (filters?.employee_id) query = query.eq("assigned_to", filters.employee_id);
    if (filters?.status) query = query.eq("status", filters.status);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }

  static async getMyAssignments(_userId?: string) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { data: userTeams } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("employee_id", user.id);

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

    if (teamIds.length > 0) {
      query = query.or(`assigned_to.eq.${user.id},team_id.in.(${teamIds.join(",")})`);
    } else {
      query = query.eq("assigned_to", user.id);
    }

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
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actualJobEntryTestId)) {
      const asInt = parseInt(actualJobEntryTestId, 10);
      const { data: byJobUid } = await supabase
        .from("job_entries")
        .select("id")
        .eq("uid", asInt)
        .maybeSingle();

      if (byJobUid) {
        const { data: jet } = await supabase
          .from("job_entry_tests")
          .select("id")
          .eq("job_entry_id", byJobUid.id)
          .limit(1)
          .maybeSingle();
        if (!jet) throw new Error(`Could not find job card with UID ${actualJobEntryTestId}`);
        actualJobEntryTestId = jet.id;
      } else {
        throw new Error(`Could not find job card with UID ${actualJobEntryTestId}`);
      }
    }

    const { data: testRow, error: testErr } = await supabase
      .from("job_entry_tests")
      .select("id, job_entry_id")
      .eq("id", actualJobEntryTestId)
      .single();
    if (testErr || !testRow) throw new Error("Job card test not found");

    await supabase.rpc("ensure_job_uid", { p_job_id: testRow.job_entry_id });

    const { data: existing, error: existingError } = await supabase
      .from("job_assignments")
      .select("id")
      .eq("job_entry_test_id", actualJobEntryTestId)
      .maybeSingle();
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
      const { data: updated, error } = await supabase
        .from("job_assignments")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return updated;
    }

    const { data: inserted, error } = await supabase
      .from("job_assignments")
      .insert([{ job_entry_test_id: actualJobEntryTestId, ...payload }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  }

  static async updateAssignmentStatus(id: string, status: string) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("roles")
      .eq("id", user.id)
      .single();
    if (profileError || !profile) throw new Error("Failed to verify permissions");

    const isManager = canManageJobAssignments(profile.roles);

    const { data: assignment, error: assignmentError } = await supabase
      .from("job_assignments")
      .select("*, teams(team_members(employee_id)), job_entry_tests ( id, job_entry_id )")
      .eq("id", id)
      .single();
    if (assignmentError || !assignment) throw new Error("Assignment not found");

    let canUpdate = isManager;
    if (!canUpdate) {
      if (assignment.assigned_to === user.id) canUpdate = true;
      else if (assignment.teams?.team_members?.some((m: any) => m.employee_id === user.id)) canUpdate = true;
    }
    if (!canUpdate) throw new Error("Insufficient permissions to update this assignment");

    const { data, error } = await supabase
      .from("job_assignments")
      .update({ status })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (status === "completed" && assignment.job_entry_tests?.job_entry_id) {
      const { error: issueError } = await supabase.rpc("issue_reports_for_job", {
        p_job_entry_id: assignment.job_entry_tests.job_entry_id,
        p_issued_by: user.id,
      });
      if (issueError) {
        console.error("issue_reports_for_job failed:", issueError);
        throw new Error(`Assignment completed but report issue failed: ${issueError.message}`);
      }
    }

    return data;
  }
}
