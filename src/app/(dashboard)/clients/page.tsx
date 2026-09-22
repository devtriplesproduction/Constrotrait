import React from "react";
import { ClientService } from "@/services/client.service";
import ClientsListClient from "./components/ClientsListClient";
import NewInwardModalButton from "./components/NewInwardModalButton";

export const metadata = {
  title: "Client Inward",
};

export default async function ClientsPage() {
  const clients = await ClientService.getAllClients();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Client Inward</h1>
          <p className="text-muted-foreground">
            View all clients and their associated inwards.
          </p>
        </div>
        <NewInwardModalButton />
      </div>

      <ClientsListClient initialClients={clients} />
    </div>
  );
}
