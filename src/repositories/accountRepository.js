const pool = require("../database/connection");

class AccountRepository {
  constructor() {
    this.pool = pool;
  }

  async getAccountsByUserId(userId) {
    const query = `
      SELECT
        a.id,
        a.account_number,
        a.account_type,
        a.balance,
        a.currency,
        a.status,
        a.created_at,
        a.updated_at
      FROM accounts a
      WHERE a.user_id = $1 AND a.status = 'active'
      ORDER BY a.created_at DESC
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async getAccountById(accountId) {
    const query = `
      SELECT
        a.*,
        u.first_name,
        u.last_name,
        u.email
      FROM accounts a
      JOIN users u ON a.user_id = u.id
      WHERE a.id = $1
    `;

    const result = await this.pool.query(query, [accountId]);
    return result.rows[0];
  }

  async createAccount({ userId, account_type, initial_balance, currency }) {
    const query = `
      INSERT INTO accounts (user_id, account_number, account_type, balance, currency)
      VALUES ($1, generate_account_number(), $2, $3, $4)
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      userId,
      account_type,
      initial_balance,
      currency,
    ]);
    return result.rows[0];
  }

  async getAccountBalance(accountId, client = this.pool) {
    const query = "SELECT balance FROM accounts WHERE id = $1 FOR UPDATE";
    const result = await client.query(query, [accountId]);
    return result.rows[0]?.balance;
  }

  async updateBalance(accountId, newBalance, client = this.pool) {
    const query = `
      UPDATE accounts
      SET balance = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await client.query(query, [accountId, newBalance]);
    return result.rows[0];
  }

  // Repository method to handle deposit transaction (including DB transaction)
  async processDeposit(accountId, amount, description, referenceNumber) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // Get current balance with row lock
      const currentBalance = await this.getAccountBalance(accountId, client);

      if (currentBalance === undefined) {
        throw new Error("Account not found");
      }

      const newBalance = parseFloat(currentBalance) + parseFloat(amount);

      // Update account balance
      await this.updateBalance(accountId, newBalance, client);

      // Create transaction record
      const transactionQuery = `
        INSERT INTO transactions (
          account_id, transaction_type, amount, balance_before,
          balance_after, description, reference_number
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const transactionResult = await client.query(transactionQuery, [
        accountId,
        "deposit",
        parseFloat(amount),
        parseFloat(currentBalance),
        newBalance,
        description,
        referenceNumber,
      ]);

      await client.query("COMMIT");
      return transactionResult.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Repository method to handle withdrawal transaction (including DB transaction)
  async processWithdrawal(accountId, amount, description, referenceNumber) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // Get current balance with row lock
      const currentBalance = await this.getAccountBalance(accountId, client);

      if (currentBalance === undefined) {
        throw new Error("Account not found");
      }

      if (parseFloat(currentBalance) < parseFloat(amount)) {
        throw new Error("Insufficient funds");
      }

      const newBalance = parseFloat(currentBalance) - parseFloat(amount);

      // Update account balance
      await this.updateBalance(accountId, newBalance, client);

      // Create transaction record
      const transactionQuery = `
        INSERT INTO transactions (
          account_id, transaction_type, amount, balance_before,
          balance_after, description, reference_number
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const transactionResult = await client.query(transactionQuery, [
        accountId,
        "withdrawal",
        parseFloat(amount),
        parseFloat(currentBalance),
        newBalance,
        description,
        referenceNumber,
      ]);

      await client.query("COMMIT");
      return transactionResult.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Repository method to handle transfer between accounts (including DB transaction)
  async processTransfer(
    fromAccountId,
    toAccountId,
    amount,
    description,
    referenceNumber
  ) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // Get current balances with row locks (lock both accounts)
      const fromBalance = await this.getAccountBalance(fromAccountId, client);
      const toBalance = await this.getAccountBalance(toAccountId, client);

      if (fromBalance === undefined) {
        throw new Error("Source account not found");
      }

      if (toBalance === undefined) {
        throw new Error("Destination account not found");
      }

      if (parseFloat(fromBalance) < parseFloat(amount)) {
        throw new Error("Insufficient funds");
      }

      const newFromBalance = parseFloat(fromBalance) - parseFloat(amount);
      const newToBalance = parseFloat(toBalance) + parseFloat(amount);

      // Update both account balances
      await this.updateBalance(fromAccountId, newFromBalance, client);
      await this.updateBalance(toAccountId, newToBalance, client);

      // Create outgoing transaction record
      const outgoingTransactionQuery = `
        INSERT INTO transactions (
          account_id, transaction_type, amount, balance_before,
          balance_after, description, reference_number, related_account_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const outgoingTransaction = await client.query(outgoingTransactionQuery, [
        fromAccountId,
        "transfer_out",
        parseFloat(amount),
        parseFloat(fromBalance),
        newFromBalance,
        description,
        referenceNumber,
        toAccountId,
      ]);

      // Create incoming transaction record
      const incomingTransactionQuery = `
        INSERT INTO transactions (
          account_id, transaction_type, amount, balance_before,
          balance_after, description, reference_number, related_account_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      await client.query(incomingTransactionQuery, [
        toAccountId,
        "transfer_in",
        parseFloat(amount),
        parseFloat(toBalance),
        newToBalance,
        `Transfer from account ${fromAccountId}`,
        `${referenceNumber}-${fromAccountId}`,
        fromAccountId,
      ]);

      await client.query("COMMIT");
      return outgoingTransaction.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Repository method to create account with initial deposit transaction
  async createAccountWithInitialDeposit({
    userId,
    account_type,
    initial_balance,
    currency,
    referenceNumber,
  }) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // Create account
      const accountQuery = `
        INSERT INTO accounts (user_id, account_number, account_type, balance, currency)
        VALUES ($1, generate_account_number(), $2, $3, $4)
        RETURNING *
      `;

      const accountResult = await client.query(accountQuery, [
        userId,
        account_type,
        initial_balance,
        currency,
      ]);

      const account = accountResult.rows[0];

      // Create initial transaction if there's a balance
      if (initial_balance > 0) {
        const transactionQuery = `
          INSERT INTO transactions (
            account_id, transaction_type, amount, balance_before,
            balance_after, description, reference_number
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;

        await client.query(transactionQuery, [
          account.id,
          "deposit",
          parseFloat(initial_balance),
          0,
          parseFloat(initial_balance),
          "Initial deposit",
          referenceNumber,
        ]);
      }

      await client.query("COMMIT");
      return account;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = AccountRepository;
