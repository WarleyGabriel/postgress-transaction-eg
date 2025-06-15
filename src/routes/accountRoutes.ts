import { Router } from "express";
import accountController from "../controllers/accountController";

const router = Router();

// Account management routes
// GET /api/accounts/user/:userId - Get all accounts for a user
router.get("/user/:userId", (req, res) =>
  accountController.getAccountsByUserId(req, res)
);

// POST /api/accounts/create - Create new account
router.post("/create", (req, res) => accountController.createAccount(req, res));

// Transaction routes (MUST come before /:accountId route)
// POST /api/accounts/:accountId/deposit - Deposit money
router.post("/:accountId/deposit", (req, res) =>
  accountController.deposit(req, res)
);

// POST /api/accounts/:accountId/withdraw - Withdraw money
router.post("/:accountId/withdraw", (req, res) =>
  accountController.withdraw(req, res)
);

// POST /api/accounts/:accountId/transfer - Transfer money between accounts
router.post("/:accountId/transfer", (req, res) =>
  accountController.transfer(req, res)
);

// Account information routes (MUST come before /:accountId route)
// GET /api/accounts/:accountId/balance - Get current account balance
router.get("/:accountId/balance", (req, res) =>
  accountController.getAccountBalance(req, res)
);

// GET /api/accounts/:accountId/transactions - Get transaction history
router.get("/:accountId/transactions", (req, res) =>
  accountController.getTransactionHistory(req, res)
);

// GET /api/accounts/:accountId/summary - Get monthly transaction summary
// Query params: year, month (e.g., ?year=2024&month=3)
router.get("/:accountId/summary", (req, res) =>
  accountController.getMonthlyTransactionSummary(req, res)
);

// General account route (MUST come LAST to avoid conflicts)
// GET /api/accounts/:accountId - Get specific account details
router.get("/:accountId", (req, res) =>
  accountController.getAccountById(req, res)
);

export default router;
