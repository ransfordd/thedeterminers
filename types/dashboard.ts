// Dashboard shared types

export type RecentTransactionType = "susu" | "loan" | "savings" | "manual";

export interface RecentTransaction {
  type: RecentTransactionType;
  ref: string;
  date: Date;
  amount: number;
  clientName: string;
}

export interface RecentApplication {
  id: number;
  applicationNumber: string;
  clientName: string;
  productName: string;
  requestedAmount: number;
  applicationStatus: string;
  appliedDate: Date;
}

export interface AgentPerformanceRow {
  agentCode: string;
  agentName: string;
  clientCount: number;
  loansManaged: number;
  totalCollections: number;
}

export interface AdminManagerMetrics {
  totalClients: number;
  totalAgents: number;
  activeLoans: number;
  pendingApplications: number;
  portfolioValue: number;
  collectionsToday: number;
  overdueLoans: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalSavings: number;
  pendingPayoutTransfers: number;
  pendingEmergencyRequests: number;
  completedCycles: number;
  cyclesCompletedThisMonth: number;
  dailyCompletedCycles: number;
  collectionRate: number;
  systemRevenue?: number; // Admin only
}

export interface AssignedClientRow {
  id: number;
  clientCode: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dailyDepositAmount: number;
  depositType?: string;
  status: string;
  createdAt: Date;
}

export interface ClientCycleSummary {
  activeCycle: {
    id: number;
    startDate: Date;
    endDate: Date;
    dailyAmount: number;
    totalAmount: number;
    status: string;
    isFlexible: boolean;
    averageDailyAmount: number | null;
  } | null;
  totalCollectedInCycle: number;
  daysCollected: number;
  totalCollectedAllTime: number;
  totalCollectedAllTimeNet: number; // after subtracting agent fees for completed cycles
  daysCollectedAllTime: number;
  completedCycles: number;
}

export interface ClientRecentActivity {
  type: "susu_collection" | "loan_payment" | "savings_deposit" | "withdrawal" | "deposit";
  amount: number;
  date: Date;
  description: string;
  title: string;
}

export interface ClientTransactionSummary {
  totalTransactions: number;
  totalCollections: number;
  totalLoanPayments: number;
  totalWithdrawals: number;
  currentCycleCollections: number;
  savingsBalance: number;
}

export type ClientTransactionFilterType =
  | "all"
  | "susu"
  | "loan"
  | "withdrawal"
  | "deposit"
  | "savings";

export interface ClientTransactionFilter {
  type?: ClientTransactionFilterType;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface ClientFilteredTransactionRow {
  type: "susu_collection" | "loan_payment" | "withdrawal" | "deposit" | "savings_deposit";
  amount: number;
  date: Date;
  description: string;
  title: string;
  reference: string | null;
}

export interface DashboardAlert {
  type: "warning" | "info" | "success" | "danger";
  message: string;
}

// Client Cycles Completed page
export interface ClientCyclesPageSummary {
  totalCycles: number;
  completedCycles: number;
  incompleteCycles: number;
  totalCollected: number;
}

export interface DailyCollectionRow {
  collectionDate: Date;
  collectedAmount: number;
  agentName: string;
  collectionStatus: string;
}

export interface ClientCycleWithDetails {
  id: number;
  cycleNumber: number;
  startDate: Date;
  endDate: Date;
  status: string;
  dailyAmount: number;
  totalAmount: number;
  payoutAmount: number;
  monthName: string;
  daysRequired: number;
  daysCollected: number;
  isComplete: boolean;
  cycleTotalCollected: number;
  dailyCollections: DailyCollectionRow[];
}

export interface ClientCyclesPageData {
  summary: ClientCyclesPageSummary;
  cycles: ClientCycleWithDetails[];
}
