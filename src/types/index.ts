// Database entity interfaces
export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: Date;
  address?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Account {
  id: number;
  user_id: number;
  account_number: string;
  account_type: AccountType;
  balance: string; // PostgreSQL decimal comes as string
  currency: Currency;
  status: AccountStatus;
  created_at: Date;
  updated_at: Date;
}

export interface Transaction {
  id: number;
  account_id: number;
  transaction_type: TransactionType;
  amount: string; // PostgreSQL decimal comes as string
  balance_before: string;
  balance_after: string;
  description: string;
  reference_number: string;
  related_account_id?: number;
  status: TransactionStatus;
  created_at: Date;
}

// Enum types
export type AccountType = "checking" | "savings" | "business";
export type Currency = "USD" | "EUR" | "GBP";
export type AccountStatus = "active" | "suspended" | "closed";
export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "transfer_in"
  | "transfer_out"
  | "fee";
export type TransactionStatus =
  | "pending"
  | "completed"
  | "failed"
  | "cancelled";

// API Request/Response DTOs
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

// Repository method parameters
export interface CreateAccountParams {
  userId: number;
  account_type: AccountType;
  initial_balance: number;
  currency: Currency;
}

export interface CreateAccountWithDepositParams extends CreateAccountParams {
  referenceNumber: string;
}

export interface CreateTransactionParams {
  account_id: number;
  transaction_type: TransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  reference_number: string;
  related_account_id?: number;
}

// Extended interfaces for database joins
export interface AccountWithUser extends Account {
  first_name: string;
  last_name: string;
  email: string;
}

export interface TransactionWithRelatedAccount extends Transaction {
  related_account_number?: string;
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

// Error types
export class BankingError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "BankingError";
    this.statusCode = statusCode;
  }
}

export class AccountNotFoundError extends BankingError {
  constructor(accountId: number) {
    super(`Account with ID ${accountId} not found`, 404);
    this.name = "AccountNotFoundError";
  }
}

export class InsufficientFundsError extends BankingError {
  constructor() {
    super("Insufficient funds", 422);
    this.name = "InsufficientFundsError";
  }
}

export class ValidationError extends BankingError {
  constructor(message: string) {
    super(message, 400);
    this.name = "ValidationError";
  }
}

// Database connection types
export interface DatabaseConfig {
  user: string;
  host: string;
  database: string;
  password: string;
  port: number;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}
