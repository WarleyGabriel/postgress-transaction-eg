const AccountRepository = require("../repositories/accountRepository");
const TransactionRepository = require("../repositories/transactionRepository");

class AccountService {
  constructor() {
    this.accountRepository = new AccountRepository();
    this.transactionRepository = new TransactionRepository();
  }

  async getAccountsByUserId(userId) {
    // Business logic validation
    if (!userId || isNaN(userId)) {
      throw new Error("Valid user ID is required");
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

  async getAccountById(accountId) {
    // Business logic validation
    if (!accountId || isNaN(accountId)) {
      throw new Error("Valid account ID is required");
    }

    // Delegate to repository
    const account = await this.accountRepository.getAccountById(accountId);

    if (!account) {
      throw new Error("Account not found");
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

  async createAccount({
    userId,
    accountType,
    initialBalance = 0,
    currency = "USD",
  }) {
    // Business logic validation
    if (!userId || isNaN(userId)) {
      throw new Error("Valid user ID is required");
    }

    if (
      !accountType ||
      !["checking", "savings", "business"].includes(accountType)
    ) {
      throw new Error(
        "Valid account type is required (checking, savings, business)"
      );
    }

    if (initialBalance < 0) {
      throw new Error("Initial balance cannot be negative");
    }

    if (!currency || !["USD", "EUR", "GBP"].includes(currency)) {
      throw new Error("Valid currency is required (USD, EUR, GBP)");
    }

    // Generate reference number for initial transaction
    const referenceNumber =
      await this.transactionRepository.generateReferenceNumber();

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

  async deposit(accountId, amount, description = "Deposit") {
    // Business logic validation
    if (!accountId || isNaN(accountId)) {
      throw new Error("Valid account ID is required");
    }

    if (!amount || amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    if (typeof description !== "string" || description.trim().length === 0) {
      throw new Error("Description is required");
    }

    // Generate reference number
    const referenceNumber =
      await this.transactionRepository.generateReferenceNumber();

    // Delegate to repository (handles entire transaction process)
    const transaction = await this.accountRepository.processDeposit(
      accountId,
      amount,
      description.trim(),
      referenceNumber
    );

    // Business logic transformation
    return this._formatTransactionResponse(transaction);
  }

  async withdraw(accountId, amount, description = "Withdrawal") {
    // Business logic validation
    if (!accountId || isNaN(accountId)) {
      throw new Error("Valid account ID is required");
    }

    if (!amount || amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    if (typeof description !== "string" || description.trim().length === 0) {
      throw new Error("Description is required");
    }

    // Generate reference number
    const referenceNumber =
      await this.transactionRepository.generateReferenceNumber();

    // Delegate to repository (handles entire transaction process including balance validation)
    const transaction = await this.accountRepository.processWithdrawal(
      accountId,
      amount,
      description.trim(),
      referenceNumber
    );

    // Business logic transformation
    return this._formatTransactionResponse(transaction);
  }

  async transfer({
    fromAccountId,
    toAccountId,
    amount,
    description = "Transfer",
  }) {
    // Business logic validation
    if (!fromAccountId || isNaN(fromAccountId)) {
      throw new Error("Valid source account ID is required");
    }

    if (!toAccountId || isNaN(toAccountId)) {
      throw new Error("Valid destination account ID is required");
    }

    if (fromAccountId === toAccountId) {
      throw new Error("Cannot transfer to the same account");
    }

    if (!amount || amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    if (typeof description !== "string" || description.trim().length === 0) {
      throw new Error("Description is required");
    }

    // Generate reference number
    const referenceNumber =
      await this.transactionRepository.generateReferenceNumber();

    // Delegate to repository (handles entire transfer process)
    const transaction = await this.accountRepository.processTransfer(
      fromAccountId,
      toAccountId,
      amount,
      description.trim(),
      referenceNumber
    );

    // Business logic transformation
    return this._formatTransactionResponse(transaction);
  }

  async getTransactionHistory(accountId, limit = 50, offset = 0) {
    // Business logic validation
    if (!accountId || isNaN(accountId)) {
      throw new Error("Valid account ID is required");
    }

    if (limit > 100) {
      throw new Error("Limit cannot exceed 100 transactions");
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
      this._formatTransactionResponse(transaction)
    );
  }

  async getAccountBalance(accountId) {
    // Business logic validation
    if (!accountId || isNaN(accountId)) {
      throw new Error("Valid account ID is required");
    }

    // Delegate to repository
    const account = await this.accountRepository.getAccountById(accountId);

    if (!account) {
      throw new Error("Account not found");
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

  async getMonthlyTransactionSummary(accountId, year, month) {
    // Business logic validation
    if (!accountId || isNaN(accountId)) {
      throw new Error("Valid account ID is required");
    }

    if (!year || year < 2000 || year > new Date().getFullYear()) {
      throw new Error("Valid year is required");
    }

    if (!month || month < 1 || month > 12) {
      throw new Error("Valid month is required (1-12)");
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
      count: parseInt(item.transaction_count),
      totalAmount: parseFloat(item.total_amount),
      averageAmount: parseFloat(item.average_amount),
    }));
  }

  // Private helper method for consistent transaction response formatting
  _formatTransactionResponse(transaction) {
    return {
      transactionId: transaction.id,
      referenceNumber: transaction.reference_number,
      type: transaction.transaction_type,
      amount: parseFloat(transaction.amount),
      balanceBefore: parseFloat(transaction.balance_before),
      balanceAfter: parseFloat(transaction.balance_after),
      description: transaction.description,
      createdAt: transaction.created_at,
      relatedAccountId: transaction.related_account_id,
      status: transaction.status || "completed",
    };
  }
}

module.exports = new AccountService();
