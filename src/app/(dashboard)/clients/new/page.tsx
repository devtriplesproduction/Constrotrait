import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { getActiveBranchesAction } from "@/actions/branch.actions";
import { isSuperAdmin } from "@/config/roles";
import { ClientWizard } from "@/components/modules/clients/ClientWizard";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "New Client | ConstroTrait",
  description: "Create a new client and test request",
};

export default async function NewClientPage({
  searchParams,
}: {
  searchParams?: Promise<{ quotation_id?: string }> | { quotation_id?: string };
}) {
  const user = await getAuthenticatedUserWithRoles();
  const branchesRes = await getActiveBranchesAction();
  const branches = branchesRes.success && branchesRes.data ? branchesRes.data : [];

  const resolvedParams = await searchParams;
  const quotationId = resolvedParams?.quotation_id;

  let fromQuotation: any = null;
  let initialAvailableTests: any[] = [];
  const initialSelectedTestIds: string[] = [];
  const initialJobTests: any[] = [];

  const supabase = await createClient();

  // Fetch all test masters so client inward wizard has them ready synchronously
  const { data: testMasters } = await supabase
    .from("test_master")
    .select(`
      id, serial_no, discipline_group, material_product, component_parameter, specific_test,
      test_method, technique_equipment, is_nabl, category, particulars, unit, sample_size,
      minimum_value, time_required, tested_as_per_is, additional_details, report_qr, datasheet_qr,
      branch_id, created_at, created_by, updated_at, updated_by,
      branches ( id, name, code )
    `)
    .order("created_at", { ascending: false });

  if (testMasters) {
    initialAvailableTests = testMasters;
  }

  if (quotationId) {
    const { data: q } = await supabase
      .from("quotations")
      .select(`
        *,
        clients ( id, name, company_name, email, mobile, address, gst_no, contact_person, division, site_name, agency_name, project_name, dispatch_name, dispatch_address, collected_by, branch_id ),
        accounting_projects ( id, name )
      `)
      .eq("id", quotationId)
      .single();

    if (q) {
      if (q.client_id && !q.clients) {
        const { data: c } = await supabase
          .from("clients")
          .select("id, name, company_name, email, mobile, address, gst_no, contact_person, division, site_name, agency_name, project_name, dispatch_name, dispatch_address, collected_by, branch_id")
          .eq("id", q.client_id)
          .single();
        if (c) q.clients = c;
      }
      fromQuotation = q;

      // Server-side match quotation items to test_master rows
      if (Array.isArray(q.items) && q.items.length > 0 && initialAvailableTests.length > 0) {
        const matchQuotationItemToTestMaster = (item: any) => {
          if (item.test_master_id) {
            const found = initialAvailableTests.find((t) => t.id === item.test_master_id);
            if (found) return found;
          }
          const textCandidates = [
            item.service_name,
            item.description,
            item.name,
            item.item_name,
          ].filter(Boolean).map((s: string) => s.toLowerCase());

          if (textCandidates.length === 0) return undefined;

          let bestMatch: any = undefined;
          let bestScore = 0;

          for (const t of initialAvailableTests) {
            const param = (t.component_parameter || "").toLowerCase().trim();
            const spec = (t.specific_test || "").toLowerCase().trim();
            const mat = (t.material_product || "").toLowerCase().trim();

            let score = 0;
            for (const text of textCandidates) {
              if (param && text === param) score += 50;
              else if (param && param.length >= 5 && text.includes(param)) score += param.length * 2;
              else if (param && param.length >= 5 && param.includes(text)) score += text.length;

              if (spec && text === spec) score += 40;
              else if (spec && spec.length >= 5 && text.includes(spec)) score += spec.length * 2;

              if (mat && text === mat) score += 30;
              else if (mat && mat.length >= 5 && text.includes(mat)) score += mat.length;

              const words = [
                ...param.split(/[\s,()/-]+/),
                ...spec.split(/[\s,()/-]+/),
                ...mat.split(/[\s,()/-]+/)
              ].filter((w: string) => w.length >= 4);

              for (const w of words) {
                if (text.includes(w)) score += 3;
              }
            }

            if (score > bestScore && score >= 3) {
              bestScore = score;
              bestMatch = t;
            }
          }

          return bestMatch;
        };

        const receivingDate = new Date().toISOString().slice(0, 10);
        const deriveInitials = (val: string) => {
          if (!val) return "";
          const words = val.replace(/[^a-zA-Z0-9\s]/g, " ").trim().split(/\s+/).filter(Boolean);
          if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
          return words.slice(0, 3).map(w => w[0]).join("").toUpperCase();
        };

        q.items.forEach((item: any, idx: number) => {
          const tm = matchQuotationItemToTestMaster(item);
          const testId = tm ? tm.id : (item.test_master_id || "");
          if (testId && !initialSelectedTestIds.includes(testId)) {
            initialSelectedTestIds.push(testId);
          }

          const testTitle = tm
            ? (tm.component_parameter || tm.specific_test || item.service_name || item.description)
            : (item.service_name || item.description || "Testing Service");
          const testMethod = tm?.test_method || tm?.tested_as_per_is || (item.service_name?.match(/\((IS\s*\d+[^)]*)\)/i)?.[1]) || "";
          const matDesc = tm?.material_product || item.description || item.service_name || "Material";
          const qtyStr = String(item.quantity || item.qty || 1);
          const initials = deriveInitials(matDesc || testTitle);

          initialJobTests.push({
            id: `qtn-item-${idx}-${Date.now()}`,
            test_master_id: testId,
            test_name: testTitle,
            test_method: testMethod,
            material_description: matDesc,
            sample_quantity: qtyStr,
            date_of_receiving: receivingDate,
            testing_age: "",
            date_of_testing: "",
            additional_details_values: {
              material_initials: initials,
              test_initials: initials,
            },
            test_master: tm,
          });
        });

        // Resolve branch_id from client or matched tests if null on quotation
        if (!fromQuotation.branch_id) {
          fromQuotation.branch_id =
            fromQuotation.clients?.branch_id ||
            initialJobTests.find((t) => t.test_master?.branch_id)?.test_master?.branch_id ||
            null;
        }
      }
    }
  }

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-80px)] py-2 flex flex-col items-center justify-start">
      <ClientWizard
        fromQuotation={fromQuotation}
        branches={branches}
        userBranchId={user?.branch_id}
        isSuperAdmin={isSuperAdmin(user?.roles || [])}
        initialAvailableTests={initialAvailableTests}
        initialSelectedTestIds={initialSelectedTestIds}
        initialJobTests={initialJobTests}
      />
    </div>
  );
}
