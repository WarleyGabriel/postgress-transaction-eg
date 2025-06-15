import { AccountType, Currency, TransactionType } from "./enums";

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
