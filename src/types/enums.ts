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
