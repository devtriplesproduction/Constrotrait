import React from "react";
import { redirect } from "next/navigation";
import { ClientService } from "@/services/client.service";
import ClientDetailsPageContent from "./ClientDetailsPageContent";

export const metadata = {
  title: "Client Details",
};

export default async function ClientDetailsPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  let client = null;
  try {
    client = await ClientService.getClientById(clientId);
  } catch (e) {
    console.error("Client not found or error:", e);
  }

  if (!client) {
    redirect("/clients");
  }

  return <ClientDetailsPageContent client={client} />;
}
