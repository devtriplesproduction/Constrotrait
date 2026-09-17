import { OnboardForm } from "@/components/modules/employees/OnboardForm";
import { PageHeader } from "@/components/modules/PageHeader";
export default function OnboardEmployeePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader
        title="Onboard New Employee"
        subtitle="Create a new ConstroTrait employee account and configure their system access."
      />

      <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
        <OnboardForm />
      </div>
    </div>
  );
}
