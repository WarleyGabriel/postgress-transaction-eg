import express, { Application, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import accountRoutes from "./routes/accountRoutes";
import { BankingError, ApiResponse } from "./types";

const app: Application = express();
const port: number = parseInt(process.env["PORT"] ?? "3000", 10);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/accounts", accountRoutes);

// Health check endpoint
app.get("/", (_req: Request, res: Response): void => {
  const response = {
    message: "TypeScript Banking API is running!",
    version: "2.0.0",
    language: "TypeScript",
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
      engine: "PostgreSQL",
    },
    architecture: {
      pattern: "Layered Architecture",
      layers: ["Controllers", "Services", "Repositories", "Database"],
      language: "TypeScript with strict type checking",
    },
  };

  res.json(response);
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response): void => {
  console.error("Unhandled error:", err);

  if (err instanceof BankingError) {
    const response: ApiResponse<null> = {
      success: false,
      error: err.message,
    };
    res.status(err.statusCode).json(response);
    return;
  }

  const response: ApiResponse<null> = {
    success: false,
    error: "Internal server error",
  };
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(response);
});

// 404 handler
app.use("*", (_req: Request, res: Response): void => {
  const response: ApiResponse<null> = {
    success: false,
    error: "Route not found",
  };
  res.status(StatusCodes.NOT_FOUND).json(response);
});

// Start server
const server = app.listen(port, (): void => {
  console.log(`🚀 TypeScript Banking API server is running on port ${port}`);
  console.log(`📖 Visit http://localhost:${port} for API documentation`);
  console.log(`🐘 pgAdmin available at http://localhost:8080`);
  console.log(`✨ Running with TypeScript and strict type checking`);
});

// Graceful shutdown
process.on("SIGTERM", (): void => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed. Exiting process.");
    process.exit(0);
  });
});

process.on("SIGINT", (): void => {
  console.log("SIGINT received. Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed. Exiting process.");
    process.exit(0);
  });
});

export default app;
