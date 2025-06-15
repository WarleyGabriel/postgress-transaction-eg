import {
  AccountType,
  Currency,
  AccountStatus,
  TransactionType,
  TransactionStatus,
} from "./enums";

// API Request DTOs
export interface CreateAccountRequest {
  userId: number;
  accountType: AccountType;
  initialBalance?: number;
  currency?: Currency;
}

export interface DepositRequest {
  amount: number;
  description?: string;
}

export interface WithdrawalRequest {
  amount: number;
  description?: string;
}

export interface TransferRequest {
  toAccountId: number;
  amount: number;
  description?: string;
}

// API Response DTOs
export interface AccountResponse {
  id: number;
  accountNumber: string;
  accountType: AccountType;
  balance: number;
  currency: Currency;
  status: AccountStatus;
  createdAt: Date;
  owner?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface TransactionResponse {
  transactionId: number;
  referenceNumber: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  createdAt: Date;
  relatedAccountId?: number;
  status: TransactionStatus;
}

export interface BalanceResponse {
  accountId: number;
  accountNumber: string;
  balance: number;
  currency: Currency;
  lastUpdated: Date;
}

export interface TransactionHistoryResponse {
  transactions: TransactionResponse[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
}

export interface MonthlyTransactionSummary {
  transactionType: TransactionType;
  count: number;
  totalAmount: number;
  averageAmount: number;
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    limit: number;
    offset: number;
    count: number;
  };
  period?: {
    year: number;
    month: number;
  };
}
