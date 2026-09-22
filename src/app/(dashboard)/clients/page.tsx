import React from "react";
import { ClientService } from "@/services/client.service";
import ClientsListClient from "./components/ClientsListClient";
import NewInwardModalButton from "./components/NewInwardModalButton";
import { PageHeader } from "@/components/modules/PageHeader";

export const metadata = {
  title: "Client Inward",
};

export default async function ClientsPage() {
  const clients = await ClientService.getAllClients();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Inward"
        description="View all clients and their associated inwards."
        actions={<NewInwardModalButton />}
      />

      <ClientsListClient initialClients={clients} />
    </div>
  );
}
