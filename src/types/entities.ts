import {
  AccountType,
  Currency,
  AccountStatus,
  TransactionType,
  TransactionStatus,
} from "./enums";

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

// Extended interfaces for database joins
export interface AccountWithUser extends Account {
  first_name: string;
  last_name: string;
  email: string;
}

export interface TransactionWithRelatedAccount extends Transaction {
  related_account_number?: string;
}
