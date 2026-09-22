import React from "react";
import { ClientService } from "@/services/client.service";
import ClientsListClient from "./components/ClientsListClient";

export const metadata = {
  title: "Client Management",
};

export default async function ClientsPage() {
  const clients = await ClientService.getAllClients();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Client Management</h1>
        <p className="text-muted-foreground">
          View all clients and their associated inwards.
        </p>
      </div>

      <ClientsListClient initialClients={clients} />
    </div>
  );
}
