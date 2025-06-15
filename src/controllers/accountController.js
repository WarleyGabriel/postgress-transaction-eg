const { StatusCodes } = require("http-status-codes");
const accountService = require("../services/accountService");

class AccountController {
  async getAccountsByUserId(req, res) {
    try {
      const { userId } = req.params;

      const accounts = await accountService.getAccountsByUserId(
        parseInt(userId)
      );

      res.status(StatusCodes.OK).json({
        success: true,
        data: accounts,
      });
    } catch (error) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getAccountById(req, res) {
    try {
      const { accountId } = req.params;

      const account = await accountService.getAccountById(parseInt(accountId));

      res.status(StatusCodes.OK).json({
        success: true,
        data: account,
      });
    } catch (error) {
      const statusCode =
        error.message === "Account not found"
          ? StatusCodes.NOT_FOUND
          : StatusCodes.BAD_REQUEST;
      res.status(statusCode).json({
        success: false,
        error: error.message,
      });
    }
  }

  async createAccount(req, res) {
    try {
      const { userId, accountType, initialBalance, currency } = req.body;

      const account = await accountService.createAccount({
        userId,
        accountType,
        initialBalance: initialBalance ? parseFloat(initialBalance) : 0,
        currency,
      });

      res.status(StatusCodes.CREATED).json({
        success: true,
        data: account,
        message: "Account created successfully",
      });
    } catch (error) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: error.message,
      });
    }
  }

  async deposit(req, res) {
    try {
      const { accountId } = req.params;
      const { amount, description } = req.body;

      const transaction = await accountService.deposit(
        parseInt(accountId),
        parseFloat(amount),
        description
      );

      res.status(StatusCodes.OK).json({
        success: true,
        data: transaction,
        message: "Deposit successful",
      });
    } catch (error) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: error.message,
      });
    }
  }

  async withdraw(req, res) {
    try {
      const { accountId } = req.params;
      const { amount, description } = req.body;

      const transaction = await accountService.withdraw(
        parseInt(accountId),
        parseFloat(amount),
        description
      );

      res.status(StatusCodes.OK).json({
        success: true,
        data: transaction,
        message: "Withdrawal successful",
      });
    } catch (error) {
      const statusCode =
        error.message === "Insufficient funds"
          ? StatusCodes.UNPROCESSABLE_ENTITY
          : StatusCodes.BAD_REQUEST;
      res.status(statusCode).json({
        success: false,
        error: error.message,
      });
    }
  }

  async transfer(req, res) {
    try {
      const { accountId } = req.params;
      const { toAccountId, amount, description } = req.body;

      const transaction = await accountService.transfer({
        fromAccountId: parseInt(accountId),
        toAccountId: parseInt(toAccountId),
        amount: parseFloat(amount),
        description,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        data: transaction,
        message: "Transfer successful",
      });
    } catch (error) {
      const statusCode =
        error.message === "Insufficient funds"
          ? StatusCodes.UNPROCESSABLE_ENTITY
          : StatusCodes.BAD_REQUEST;
      res.status(statusCode).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getTransactionHistory(req, res) {
    try {
      const { accountId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const transactions = await accountService.getTransactionHistory(
        parseInt(accountId),
        parseInt(limit),
        parseInt(offset)
      );

      res.status(StatusCodes.OK).json({
        success: true,
        data: transactions,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          count: transactions.length,
        },
      });
    } catch (error) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getAccountBalance(req, res) {
    try {
      const { accountId } = req.params;

      const balance = await accountService.getAccountBalance(
        parseInt(accountId)
      );

      res.status(StatusCodes.OK).json({
        success: true,
        data: balance,
      });
    } catch (error) {
      const statusCode =
        error.message === "Account not found"
          ? StatusCodes.NOT_FOUND
          : StatusCodes.BAD_REQUEST;
      res.status(statusCode).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getMonthlyTransactionSummary(req, res) {
    try {
      const { accountId } = req.params;
      const { year, month } = req.query;

      if (!year || !month) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: "Year and month are required query parameters",
        });
      }

      const summary = await accountService.getMonthlyTransactionSummary(
        parseInt(accountId),
        parseInt(year),
        parseInt(month)
      );

      res.status(StatusCodes.OK).json({
        success: true,
        data: summary,
        period: {
          year: parseInt(year),
          month: parseInt(month),
        },
      });
    } catch (error) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = new AccountController();
