import { Pool, PoolClient, QueryResult } from "pg";
import pool from "../database/connection";
import {
  Transaction,
  TransactionWithRelatedAccount,
  CreateTransactionParams,
  TransactionType,
} from "../types";

export class TransactionRepository {
  private readonly pool: Pool;

  constructor() {
    this.pool = pool;
  }

  async createTransaction(
    transactionData: CreateTransactionParams,
    client: PoolClient | Pool = this.pool
  ): Promise<Transaction> {
    const {
      account_id,
      transaction_type,
      amount,
      balance_before,
      balance_after,
      description,
      reference_number,
      related_account_id = null,
    } = transactionData;

    const query = `
      INSERT INTO transactions (
        account_id, transaction_type, amount, balance_before,
        balance_after, description, reference_number, related_account_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result: QueryResult<Transaction> = await client.query(query, [
      account_id,
      transaction_type,
      amount.toString(),
      balance_before.toString(),
      balance_after.toString(),
      description,
      reference_number,
      related_account_id,
    ]);

    return result.rows[0]!;
  }

  generateReferenceNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `TXN${timestamp}${random}`;
  }

  async getTransactionsByAccountId(
    accountId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<TransactionWithRelatedAccount[]> {
    const query = `
      SELECT
        t.*,
        CASE
          WHEN t.related_account_id IS NOT NULL THEN a2.account_number
          ELSE NULL
        END as related_account_number
      FROM transactions t
      LEFT JOIN accounts a2 ON t.related_account_id = a2.id
      WHERE t.account_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result: QueryResult<TransactionWithRelatedAccount> =
      await this.pool.query(query, [accountId, limit, offset]);
    return result.rows;
  }

  async getTransactionById(
    transactionId: number
  ): Promise<TransactionWithRelatedAccount | null> {
    const query = `
      SELECT
        t.*,
        a.account_number,
        CASE
          WHEN t.related_account_id IS NOT NULL THEN a2.account_number
          ELSE NULL
        END as related_account_number
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      LEFT JOIN accounts a2 ON t.related_account_id = a2.id
      WHERE t.id = $1
    `;

    const result: QueryResult<TransactionWithRelatedAccount> =
      await this.pool.query(query, [transactionId]);
    return result.rows[0] ?? null;
  }

  async getTransactionsByDateRange(
    accountId: number,
    startDate: Date,
    endDate: Date
  ): Promise<Transaction[]> {
    const query = `
      SELECT *
      FROM transactions
      WHERE account_id = $1
      AND created_at >= $2
      AND created_at <= $3
      ORDER BY created_at DESC
    `;

    const result: QueryResult<Transaction> = await this.pool.query(query, [
      accountId,
      startDate,
      endDate,
    ]);
    return result.rows;
  }

  async getTransactionsByType(
    accountId: number,
    transactionType: TransactionType
  ): Promise<Transaction[]> {
    const query = `
      SELECT *
      FROM transactions
      WHERE account_id = $1
      AND transaction_type = $2
      ORDER BY created_at DESC
    `;

    const result: QueryResult<Transaction> = await this.pool.query(query, [
      accountId,
      transactionType,
    ]);
    return result.rows;
  }

  async getMonthlyTransactionSummary(
    accountId: number,
    year: number,
    month: number
  ): Promise<
    Array<{
      transaction_type: TransactionType;
      transaction_count: string;
      total_amount: string;
      average_amount: string;
    }>
  > {
    const query = `
      SELECT
        transaction_type,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount,
        AVG(amount) as average_amount
      FROM transactions
      WHERE account_id = $1
      AND EXTRACT(YEAR FROM created_at) = $2
      AND EXTRACT(MONTH FROM created_at) = $3
      GROUP BY transaction_type
      ORDER BY transaction_type
    `;

    const result = await this.pool.query(query, [accountId, year, month]);
    return result.rows;
  }
}
