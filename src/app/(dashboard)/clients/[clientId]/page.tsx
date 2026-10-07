import React from "react";
import { notFound } from "next/navigation";
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
  const client = await ClientService.getClientById(clientId);

  if (!client) {
    notFound();
  }

  return <ClientDetailsPageContent client={client} />;
}
