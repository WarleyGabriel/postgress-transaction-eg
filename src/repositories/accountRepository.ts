import { Pool, PoolClient, QueryResult } from "pg";
import pool from "../database/connection";
import {
  Account,
  AccountWithUser,
  CreateAccountParams,
  CreateAccountWithDepositParams,
  AccountNotFoundError,
  InsufficientFundsError,
  Transaction,
} from "../types";

export class AccountRepository {
  private readonly pool: Pool;

  constructor() {
    this.pool = pool;
  }

  async getAccountsByUserId(userId: number): Promise<Account[]> {
    const query = `
      SELECT
        a.id,
        a.user_id,
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

    const result: QueryResult<Account> = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async getAccountById(accountId: number): Promise<AccountWithUser | null> {
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

    const result: QueryResult<AccountWithUser> = await this.pool.query(query, [
      accountId,
    ]);
    return result.rows[0] ?? null;
  }

  async createAccount(params: CreateAccountParams): Promise<Account> {
    const { userId, account_type, initial_balance, currency } = params;

    const query = `
      INSERT INTO accounts (user_id, account_number, account_type, balance, currency)
      VALUES ($1, generate_account_number(), $2, $3, $4)
      RETURNING *
    `;

    const result: QueryResult<Account> = await this.pool.query(query, [
      userId,
      account_type,
      initial_balance.toString(),
      currency,
    ]);

    return result.rows[0]!;
  }

  async getAccountBalance(
    accountId: number,
    client: PoolClient | Pool = this.pool
  ): Promise<string | null> {
    const query = "SELECT balance FROM accounts WHERE id = $1 FOR UPDATE";
    const result: QueryResult<{ balance: string }> = await client.query(query, [
      accountId,
    ]);
    return result.rows[0]?.balance ?? null;
  }

  async updateBalance(
    accountId: number,
    newBalance: number,
    client: PoolClient | Pool = this.pool
  ): Promise<Account> {
    const query = `
      UPDATE accounts
      SET balance = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result: QueryResult<Account> = await client.query(query, [
      accountId,
      newBalance.toString(),
    ]);

    if (result.rows.length === 0) {
      throw new AccountNotFoundError(accountId);
    }

    return result.rows[0]!;
  }

  async processDeposit(
    accountId: number,
    amount: number,
    description: string,
    referenceNumber: string
  ): Promise<Transaction> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const currentBalance = await this.getAccountBalance(accountId, client);

      if (currentBalance === null) {
        throw new AccountNotFoundError(accountId);
      }

      const balanceBefore = parseFloat(currentBalance);
      const newBalance = balanceBefore + amount;

      await this.updateBalance(accountId, newBalance, client);

      const transactionQuery = `
        INSERT INTO transactions (
          account_id, transaction_type, amount, balance_before,
          balance_after, description, reference_number
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const transactionResult: QueryResult<Transaction> = await client.query(
        transactionQuery,
        [
          accountId,
          "deposit",
          amount.toString(),
          balanceBefore.toString(),
          newBalance.toString(),
          description,
          referenceNumber,
        ]
      );

      await client.query("COMMIT");
      return transactionResult.rows[0]!;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async processWithdrawal(
    accountId: number,
    amount: number,
    description: string,
    referenceNumber: string
  ): Promise<Transaction> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const currentBalance = await this.getAccountBalance(accountId, client);

      if (currentBalance === null) {
        throw new AccountNotFoundError(accountId);
      }

      const balanceBefore = parseFloat(currentBalance);

      if (balanceBefore < amount) {
        throw new InsufficientFundsError();
      }

      const newBalance = balanceBefore - amount;

      await this.updateBalance(accountId, newBalance, client);

      const transactionQuery = `
        INSERT INTO transactions (
          account_id, transaction_type, amount, balance_before,
          balance_after, description, reference_number
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const transactionResult: QueryResult<Transaction> = await client.query(
        transactionQuery,
        [
          accountId,
          "withdrawal",
          amount.toString(),
          balanceBefore.toString(),
          newBalance.toString(),
          description,
          referenceNumber,
        ]
      );

      await client.query("COMMIT");
      return transactionResult.rows[0]!;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async processTransfer(
    fromAccountId: number,
    toAccountId: number,
    amount: number,
    description: string,
    referenceNumber: string
  ): Promise<Transaction> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const fromBalance = await this.getAccountBalance(fromAccountId, client);
      const toBalance = await this.getAccountBalance(toAccountId, client);

      if (fromBalance === null) {
        throw new AccountNotFoundError(fromAccountId);
      }

      if (toBalance === null) {
        throw new AccountNotFoundError(toAccountId);
      }

      const fromBalanceNum = parseFloat(fromBalance);
      const toBalanceNum = parseFloat(toBalance);

      if (fromBalanceNum < amount) {
        throw new InsufficientFundsError();
      }

      const newFromBalance = fromBalanceNum - amount;
      const newToBalance = toBalanceNum + amount;

      await this.updateBalance(fromAccountId, newFromBalance, client);
      await this.updateBalance(toAccountId, newToBalance, client);

      const outgoingTransactionQuery = `
        INSERT INTO transactions (
          account_id, transaction_type, amount, balance_before,
          balance_after, description, reference_number, related_account_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const outgoingTransaction: QueryResult<Transaction> = await client.query(
        outgoingTransactionQuery,
        [
          fromAccountId,
          "transfer_out",
          amount.toString(),
          fromBalanceNum.toString(),
          newFromBalance.toString(),
          description,
          referenceNumber,
          toAccountId,
        ]
      );

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
        amount.toString(),
        toBalanceNum.toString(),
        newToBalance.toString(),
        `Transfer from account ${fromAccountId}`,
        `${referenceNumber}-${fromAccountId}`,
        fromAccountId,
      ]);

      await client.query("COMMIT");
      return outgoingTransaction.rows[0]!;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async createAccountWithInitialDeposit(
    params: CreateAccountWithDepositParams
  ): Promise<Account> {
    const { userId, account_type, initial_balance, currency, referenceNumber } =
      params;
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const accountQuery = `
        INSERT INTO accounts (user_id, account_number, account_type, balance, currency)
        VALUES ($1, generate_account_number(), $2, $3, $4)
        RETURNING *
      `;

      const accountResult: QueryResult<Account> = await client.query(
        accountQuery,
        [userId, account_type, initial_balance.toString(), currency]
      );

      const account = accountResult.rows[0]!;

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
          initial_balance.toString(),
          "0",
          initial_balance.toString(),
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
