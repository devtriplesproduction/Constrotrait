import React from "react";
import { ClientService } from "@/services/client.service";
import ClientInwardManager from "./components/ClientInwardManager";

export const metadata = {
  title: "Client Inward",
};

export default async function ClientsPage() {
  const clients = await ClientService.getAllClients();

  return <ClientInwardManager initialClients={clients} />;
}
