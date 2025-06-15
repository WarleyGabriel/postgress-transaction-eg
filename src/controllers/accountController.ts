import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import accountService from "../services/accountService";
import {
  ValidationError,
  AccountNotFoundError,
  InsufficientFundsError,
  BankingError,
} from "../types";

export class AccountController {
  // Helper method to validate and parse numeric parameters
  private validateAndParseId(
    value: string | undefined,
    paramName: string
  ): number {
    if (!value) {
      throw new ValidationError(`${paramName} is required`);
    }
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed <= 0) {
      throw new ValidationError(`Valid ${paramName} is required`);
    }
    return parsed;
  }

  async getAccountsByUserId(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const userIdNum = this.validateAndParseId(userId, "User ID");

      const accounts = await accountService.getAccountsByUserId(userIdNum);
      res.status(StatusCodes.OK).json({
        success: true,
        data: accounts,
      });
    } catch (error) {
      this.handleControllerError(error, res);
    }
  }

  async getAccountById(req: Request, res: Response): Promise<void> {
    try {
      const { accountId } = req.params;
      const accountIdNum = this.validateAndParseId(accountId, "Account ID");

      const account = await accountService.getAccountById(accountIdNum);
      res.status(StatusCodes.OK).json({
        success: true,
        data: account,
      });
    } catch (error) {
      this.handleControllerError(error, res);
    }
  }

  async createAccount(req: Request, res: Response): Promise<void> {
    try {
      const { userId, accountType, initialBalance, currency } = req.body;

      // Validate required fields
      if (!userId) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: "User ID is required",
        });
        return;
      }

      if (!accountType) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: "Account type is required",
        });
        return;
      }

      const account = await accountService.createAccount({
        userId: parseInt(userId, 10),

        accountType,

        initialBalance: initialBalance ? parseFloat(initialBalance) : 0,
        currency: currency ?? "USD",
      });

      res.status(StatusCodes.CREATED).json({
        success: true,
        data: account,
        message: "Account created successfully",
      });
    } catch (error) {
      this.handleControllerError(error, res);
    }
  }

  async deposit(req: Request, res: Response): Promise<void> {
    try {
      const { accountId } = req.params;
      const { amount, description } = req.body;
      const accountIdNum = this.validateAndParseId(accountId, "Account ID");

      if (!amount || amount <= 0) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: "Valid amount is required",
        });
        return;
      }

      const transaction = await accountService.deposit(
        accountIdNum,

        parseFloat(amount),
        description ?? "Deposit"
      );

      res.status(StatusCodes.OK).json({
        success: true,
        data: transaction,
        message: "Deposit completed successfully",
      });
    } catch (error) {
      this.handleControllerError(error, res);
    }
  }

  async withdraw(req: Request, res: Response): Promise<void> {
    try {
      const { accountId } = req.params;
      const { amount, description } = req.body;
      const accountIdNum = this.validateAndParseId(accountId, "Account ID");

      if (!amount || amount <= 0) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: "Valid amount is required",
        });
        return;
      }

      const transaction = await accountService.withdraw(
        accountIdNum,

        parseFloat(amount),
        description ?? "Withdrawal"
      );

      res.status(StatusCodes.OK).json({
        success: true,
        data: transaction,
        message: "Withdrawal completed successfully",
      });
    } catch (error) {
      this.handleControllerError(error, res);
    }
  }

  async transfer(req: Request, res: Response): Promise<void> {
    try {
      const { accountId } = req.params;
      const { toAccountId, amount, description } = req.body;
      const fromAccountIdNum = this.validateAndParseId(
        accountId,
        "From Account ID"
      );

      if (!toAccountId) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: "Destination account ID is required",
        });
        return;
      }

      if (!amount || amount <= 0) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: "Valid amount is required",
        });
        return;
      }

      const toAccountIdNum = parseInt(toAccountId, 10);
      if (isNaN(toAccountIdNum) || toAccountIdNum <= 0) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: "Valid destination account ID is required",
        });
        return;
      }

      const transaction = await accountService.transfer(
        fromAccountIdNum,
        toAccountIdNum,

        parseFloat(amount),
        description ?? "Transfer"
      );

      res.status(StatusCodes.OK).json({
        success: true,
        data: transaction,
        message: "Transfer completed successfully",
      });
    } catch (error) {
      this.handleControllerError(error, res);
    }
  }

  async getTransactionHistory(req: Request, res: Response): Promise<void> {
    try {
      const { accountId } = req.params;
      const { limit, offset } = req.query;
      const accountIdNum = this.validateAndParseId(accountId, "Account ID");

      const limitNum = limit ? parseInt(limit as string, 10) : 50;

      const offsetNum = offset ? parseInt(offset as string, 10) : 0;

      const transactions = await accountService.getTransactionHistory(
        accountIdNum,
        limitNum,
        offsetNum
      );

      res.status(StatusCodes.OK).json({
        success: true,
        data: transactions,
      });
    } catch (error) {
      this.handleControllerError(error, res);
    }
  }

  async getAccountBalance(req: Request, res: Response): Promise<void> {
    try {
      const { accountId } = req.params;
      const accountIdNum = this.validateAndParseId(accountId, "Account ID");

      const balance = await accountService.getAccountBalance(accountIdNum);
      res.status(StatusCodes.OK).json({
        success: true,
        data: balance,
      });
    } catch (error) {
      this.handleControllerError(error, res);
    }
  }

  async getMonthlyTransactionSummary(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { accountId } = req.params;
      const { year, month } = req.query;
      const accountIdNum = this.validateAndParseId(accountId, "Account ID");

      if (!year || !month) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: "Year and month are required",
        });
        return;
      }

      const yearNum = parseInt(year as string, 10);

      const monthNum = parseInt(month as string, 10);

      const summary = await accountService.getMonthlyTransactionSummary(
        accountIdNum,
        yearNum,
        monthNum
      );

      res.status(StatusCodes.OK).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      this.handleControllerError(error, res);
    }
  }

  private handleControllerError(error: unknown, res: Response): void {
    console.error("Controller error:", error);

    if (error instanceof ValidationError) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: error.message,
      });
      return;
    }

    if (error instanceof AccountNotFoundError) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: error.message,
      });
      return;
    }

    if (error instanceof InsufficientFundsError) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: error.message,
      });
      return;
    }

    if (error instanceof BankingError) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: error.message,
      });
      return;
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: "Internal server error",
    });
  }
}

export default new AccountController();
