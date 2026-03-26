"use client";

import { useState } from "react";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { CollectForm } from "./CollectForm";
import { ClientInformationCard } from "./ClientInformationCard";
import { RecentCollectionsCard, type RecentCollectionItem } from "./RecentCollectionsCard";
export type ClientOption = {
  id: number;
  clientCode: string;
  name: string;
  dailyAmount: number;
  phone: string | null;
  email: string | null;
  depositType: string;
  agentCode: string;
};

export function CollectLayout({
  clients,
  recentCollections,
  initialClientId,
  initialAccountType = "susu",
  initialSusuAmount,
}: {
  clients: ClientOption[];
  recentCollections: RecentCollectionItem[];
  initialClientId?: number;
  initialAccountType?: string;
  initialSusuAmount?: number;
}) {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(initialClientId ?? null);

  const clientDetails = clients.map((c) => ({
    id: c.id,
    clientCode: c.clientCode,
    name: c.name,
    phone: c.phone,
    email: c.email,
    dailyAmount: c.dailyAmount,
    depositType: c.depositType,
    agentCode: c.agentCode,
  }));

  const formClients = clients.map((c) => ({
    id: c.id,
    clientCode: c.clientCode,
    name: c.name,
    dailyAmount: c.dailyAmount,
    depositType: c.depositType,
  }));

  return (
    <>
      <PageHeader
        title="Record Payment Collection"
        subtitle="Collect Susu savings and loan payments from clients"
        icon={<i className="fas fa-money-bill-wave" />}
        backHref="/agent"
        variant="green"
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ModernCard
            title="Payment Collection Form"
            subtitle="Enter payment details for the selected client"
            icon={<i className="fas fa-credit-card text-emerald-600" />}
          >
            {clients.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                No active clients in the system. Contact the administrator to add or activate clients.
              </p>
            ) : (
              <CollectForm
                clients={formClients}
                onClientSelect={setSelectedClientId}
                initialClientId={initialClientId}
                initialAccountType={initialAccountType}
                initialSusuAmount={initialSusuAmount}
              />
            )}
          </ModernCard>
        </div>
        <div className="space-y-4">
          <ClientInformationCard
            selectedClientId={selectedClientId}
            clients={clientDetails}
          />
          <RecentCollectionsCard items={recentCollections} />
        </div>
      </div>
    </>
  );
}
