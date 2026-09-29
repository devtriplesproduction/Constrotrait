import { ClientWizard } from "@/components/modules/clients/ClientWizard";

export const metadata = {
  title: "New Client | ConstroTrait",
  description: "Create a new client and test request",
};

export default function NewClientPage() {
  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-80px)] py-2 flex flex-col items-center justify-start">
      <ClientWizard />
    </div>
  );
}
