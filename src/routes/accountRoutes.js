const express = require("express");
const accountController = require("../controllers/accountController");

const router = express.Router();

// Account management routes
// GET /api/accounts/user/:userId - Get all accounts for a user
router.get("/user/:userId", accountController.getAccountsByUserId);

// POST /api/accounts/create - Create new account
router.post("/create", accountController.createAccount);

// Transaction routes (MUST come before /:accountId route)
// POST /api/accounts/:accountId/deposit - Deposit money
router.post("/:accountId/deposit", accountController.deposit);

// POST /api/accounts/:accountId/withdraw - Withdraw money
router.post("/:accountId/withdraw", accountController.withdraw);

// POST /api/accounts/:accountId/transfer - Transfer money between accounts
router.post("/:accountId/transfer", accountController.transfer);

// Account information routes (MUST come before /:accountId route)
// GET /api/accounts/:accountId/balance - Get current account balance
router.get("/:accountId/balance", accountController.getAccountBalance);

// GET /api/accounts/:accountId/transactions - Get transaction history
router.get("/:accountId/transactions", accountController.getTransactionHistory);

// GET /api/accounts/:accountId/summary - Get monthly transaction summary
// Query params: year, month (e.g., ?year=2024&month=3)
router.get(
  "/:accountId/summary",
  accountController.getMonthlyTransactionSummary
);

// General account route (MUST come LAST to avoid conflicts)
// GET /api/accounts/:accountId - Get specific account details
router.get("/:accountId", accountController.getAccountById);

module.exports = router;
