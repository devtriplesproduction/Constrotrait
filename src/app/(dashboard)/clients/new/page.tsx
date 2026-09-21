import { ClientWizard } from "@/components/modules/clients/ClientWizard";

export const metadata = {
  title: "New Client | ConstroTrait",
  description: "Create a new client and test request",
};

export default function NewClientPage() {
  return (
    <div className="container mx-auto py-8">
      <ClientWizard />
    </div>
  );
}
