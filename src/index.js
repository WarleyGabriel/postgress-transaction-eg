const express = require("express");
const { StatusCodes } = require("http-status-codes");
const accountRoutes = require("./routes/accountRoutes");

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/accounts", accountRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Banking API is running!",
    version: "1.0.0",
    endpoints: {
      // Account Management
      "GET /api/accounts/user/:userId": "Get all accounts for a user",
      "GET /api/accounts/:accountId": "Get specific account details",
      "POST /api/accounts/create": "Create new account",

      // Transaction Operations
      "POST /api/accounts/:accountId/deposit": "Deposit money to account",
      "POST /api/accounts/:accountId/withdraw": "Withdraw money from account",
      "POST /api/accounts/:accountId/transfer":
        "Transfer money between accounts",

      // Account Information
      "GET /api/accounts/:accountId/balance": "Get current account balance",
      "GET /api/accounts/:accountId/transactions":
        "Get transaction history (with pagination)",
      "GET /api/accounts/:accountId/summary":
        "Get monthly transaction summary (?year=2024&month=3)",
    },
    database: {
      status: "Connected via connection pool",
      features: ["ACID transactions", "Row-level locking", "Concurrent safety"],
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: "Internal server error",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    error: "Route not found",
  });
});

app.listen(port, () => {
  console.log(`Banking API server is running on port ${port}`);
  console.log(`Visit http://localhost:${port} for API documentation`);
  console.log(`pgAdmin available at http://localhost:8080`);
});

module.exports = app;
