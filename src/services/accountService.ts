import { AccountRepository } from "../repositories/accountRepository";
import { TransactionRepository } from "../repositories/transactionRepository";
import {
  AccountResponse,
  TransactionResponse,
  BalanceResponse,
  MonthlyTransactionSummary,
  CreateAccountRequest,
  ValidationError,
  AccountNotFoundError,
  AccountType,
  Currency,
  Transaction,
} from "../types";

export class AccountService {
  private readonly accountRepository: AccountRepository;
  private readonly transactionRepository: TransactionRepository;

  constructor() {
    this.accountRepository = new AccountRepository();
    this.transactionRepository = new TransactionRepository();
  }

  async getAccountsByUserId(userId: number): Promise<AccountResponse[]> {
    // Business logic validation
    if (!userId || isNaN(userId) || userId <= 0) {
      throw new ValidationError("Valid user ID is required");
    }

    // Delegate to repository
    const accounts = await this.accountRepository.getAccountsByUserId(userId);

    // Business logic transformation
    return accounts.map((account) => ({
      id: account.id,
      accountNumber: account.account_number,
      accountType: account.account_type,
      balance: parseFloat(account.balance),
      currency: account.currency,
      status: account.status,
      createdAt: account.created_at,
    }));
  }

  async getAccountById(accountId: number): Promise<AccountResponse> {
    // Business logic validation
    if (!accountId || isNaN(accountId) || accountId <= 0) {
      throw new ValidationError("Valid account ID is required");
    }

    // Delegate to repository
    const account = await this.accountRepository.getAccountById(accountId);

    if (!account) {
      throw new AccountNotFoundError(accountId);
    }

    // Business logic transformation
    return {
      id: account.id,
      accountNumber: account.account_number,
      accountType: account.account_type,
      balance: parseFloat(account.balance),
      currency: account.currency,
      status: account.status,
      owner: {
        firstName: account.first_name,
        lastName: account.last_name,
        email: account.email,
      },
      createdAt: account.created_at,
    };
  }

  async createAccount(request: CreateAccountRequest): Promise<AccountResponse> {
    const {
      userId,
      accountType,
      initialBalance = 0,
      currency = "USD",
    } = request;

    // Business logic validation
    if (!userId || isNaN(userId) || userId <= 0) {
      throw new ValidationError("Valid user ID is required");
    }

    if (!accountType || !this.isValidAccountType(accountType)) {
      throw new ValidationError(
        "Valid account type is required (checking, savings, business)"
      );
    }

    if (initialBalance < 0) {
      throw new ValidationError("Initial balance cannot be negative");
    }

    if (!currency || !this.isValidCurrency(currency)) {
      throw new ValidationError("Valid currency is required (USD, EUR, GBP)");
    }

    // Generate reference number for initial transaction
    const referenceNumber =
      this.transactionRepository.generateReferenceNumber();

    // Delegate to repository (handles both account creation and initial transaction)
    const account =
      initialBalance > 0
        ? await this.accountRepository.createAccountWithInitialDeposit({
            userId,
            account_type: accountType,
            initial_balance: initialBalance,
            currency,
            referenceNumber,
          })
        : await this.accountRepository.createAccount({
            userId,
            account_type: accountType,
            initial_balance: initialBalance,
            currency,
          });

    // Business logic transformation
    return {
      id: account.id,
      accountNumber: account.account_number,
      accountType: account.account_type,
      balance: parseFloat(account.balance),
      currency: account.currency,
      status: account.status,
      createdAt: account.created_at,
    };
  }

  async deposit(
    accountId: number,
    amount: number,
    description: string = "Deposit"
  ): Promise<TransactionResponse> {
    // Business logic validation
    if (!accountId || isNaN(accountId) || accountId <= 0) {
      throw new ValidationError("Valid account ID is required");
    }

    if (!amount || amount <= 0 || isNaN(amount)) {
      throw new ValidationError("Amount must be greater than 0");
    }

    if (typeof description !== "string" || description.trim().length === 0) {
      throw new ValidationError("Description is required");
    }

    // Generate reference number
    const referenceNumber =
      this.transactionRepository.generateReferenceNumber();

    // Delegate to repository (handles entire transaction process)
    const transaction = await this.accountRepository.processDeposit(
      accountId,
      amount,
      description.trim(),
      referenceNumber
    );

    // Business logic transformation
    return this.formatTransactionResponse(transaction);
  }

  async withdraw(
    accountId: number,
    amount: number,
    description: string = "Withdrawal"
  ): Promise<TransactionResponse> {
    // Business logic validation
    if (!accountId || isNaN(accountId) || accountId <= 0) {
      throw new ValidationError("Valid account ID is required");
    }

    if (!amount || amount <= 0 || isNaN(amount)) {
      throw new ValidationError("Amount must be greater than 0");
    }

    if (typeof description !== "string" || description.trim().length === 0) {
      throw new ValidationError("Description is required");
    }

    // Generate reference number
    const referenceNumber =
      this.transactionRepository.generateReferenceNumber();

    // Delegate to repository (handles entire transaction process including balance validation)
    const transaction = await this.accountRepository.processWithdrawal(
      accountId,
      amount,
      description.trim(),
      referenceNumber
    );

    // Business logic transformation
    return this.formatTransactionResponse(transaction);
  }

  async transfer(
    fromAccountId: number,
    toAccountId: number,
    amount: number,
    description: string = "Transfer"
  ): Promise<TransactionResponse> {
    // Business logic validation
    if (!fromAccountId || isNaN(fromAccountId) || fromAccountId <= 0) {
      throw new ValidationError("Valid source account ID is required");
    }

    if (!toAccountId || isNaN(toAccountId) || toAccountId <= 0) {
      throw new ValidationError("Valid destination account ID is required");
    }

    if (fromAccountId === toAccountId) {
      throw new ValidationError("Cannot transfer to the same account");
    }

    if (!amount || amount <= 0 || isNaN(amount)) {
      throw new ValidationError("Amount must be greater than 0");
    }

    if (typeof description !== "string" || description.trim().length === 0) {
      throw new ValidationError("Description is required");
    }

    // Generate reference number
    const referenceNumber =
      this.transactionRepository.generateReferenceNumber();

    // Delegate to repository (handles entire transfer process)
    const transaction = await this.accountRepository.processTransfer(
      fromAccountId,
      toAccountId,
      amount,
      description.trim(),
      referenceNumber
    );

    // Business logic transformation
    return this.formatTransactionResponse(transaction);
  }

  async getTransactionHistory(
    accountId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<TransactionResponse[]> {
    // Business logic validation
    if (!accountId || isNaN(accountId) || accountId <= 0) {
      throw new ValidationError("Valid account ID is required");
    }

    if (limit > 100 || limit <= 0) {
      throw new ValidationError("Limit must be between 1 and 100 transactions");
    }

    if (offset < 0) {
      throw new ValidationError("Offset must be non-negative");
    }

    // Delegate to repository
    const transactions =
      await this.transactionRepository.getTransactionsByAccountId(
        accountId,
        limit,
        offset
      );

    // Business logic transformation
    return transactions.map((transaction) =>
      this.formatTransactionResponse(transaction)
    );
  }

  async getAccountBalance(accountId: number): Promise<BalanceResponse> {
    // Business logic validation
    if (!accountId || isNaN(accountId) || accountId <= 0) {
      throw new ValidationError("Valid account ID is required");
    }

    // Delegate to repository
    const account = await this.accountRepository.getAccountById(accountId);

    if (!account) {
      throw new AccountNotFoundError(accountId);
    }

    // Business logic transformation
    return {
      accountId: account.id,
      accountNumber: account.account_number,
      balance: parseFloat(account.balance),
      currency: account.currency,
      lastUpdated: account.updated_at,
    };
  }

  async getMonthlyTransactionSummary(
    accountId: number,
    year: number,
    month: number
  ): Promise<MonthlyTransactionSummary[]> {
    // Business logic validation
    if (!accountId || isNaN(accountId) || accountId <= 0) {
      throw new ValidationError("Valid account ID is required");
    }

    const currentYear = new Date().getFullYear();
    if (!year || year < 2000 || year > currentYear) {
      throw new ValidationError(`Valid year is required (2000-${currentYear})`);
    }

    if (!month || month < 1 || month > 12) {
      throw new ValidationError("Valid month is required (1-12)");
    }

    // Delegate to repository
    const summary =
      await this.transactionRepository.getMonthlyTransactionSummary(
        accountId,
        year,
        month
      );

    // Business logic transformation
    return summary.map((item) => ({
      transactionType: item.transaction_type,
      count: parseInt(item.transaction_count, 10),
      totalAmount: parseFloat(item.total_amount),
      averageAmount: parseFloat(item.average_amount),
    }));
  }

  // Private helper methods
  private formatTransactionResponse(
    transaction: Transaction
  ): TransactionResponse {
    return {
      transactionId: transaction.id,
      referenceNumber: transaction.reference_number,
      type: transaction.transaction_type,
      amount: parseFloat(transaction.amount),
      balanceBefore: parseFloat(transaction.balance_before),
      balanceAfter: parseFloat(transaction.balance_after),
      description: transaction.description,
      createdAt: transaction.created_at,
      ...(transaction.related_account_id !== undefined && {
        relatedAccountId: transaction.related_account_id,
      }),
      status: transaction.status,
    };
  }

  private isValidAccountType(accountType: string): accountType is AccountType {
    return ["checking", "savings", "business"].includes(accountType);
  }

  private isValidCurrency(currency: string): currency is Currency {
    return ["USD", "EUR", "GBP"].includes(currency);
  }
}

// Export singleton instance
export default new AccountService();
