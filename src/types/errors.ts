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
