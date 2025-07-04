# TypeScript Banking System API

A banking system built with **TypeScript**, Node.js, Express, and PostgreSQL. This project features strict type safety, comprehensive interfaces, and a RESTful API for managing users, accounts, and financial transactions with proper error handling, concurrent transaction safety, and enterprise-grade architecture.

## 🏗️ Project Structure

```
postgress-transaction-eg/
├── src/                               # TypeScript source code directory
│   ├── index.ts                       # Main application entry point
│   ├── types/                         # TypeScript interfaces and types
│   │   ├── index.ts                   # Re-exports all type definitions
│   │   ├── enums.ts                   # Type unions and enums
│   │   ├── entities.ts                # Database entity interfaces
│   │   ├── api.ts                     # API request/response DTOs
│   │   ├── repository.ts              # Repository method parameters
│   │   ├── database.ts                # Database connection types
│   │   └── errors.ts                  # Custom error classes
│   ├── database/                      # Database connection setup
│   │   └── connection.ts              # PostgreSQL connection pool with typing
│   ├── repositories/                  # Data access layer
│   │   ├── accountRepository.ts       # Account database operations
│   │   └── transactionRepository.ts   # Transaction database operations
│   ├── services/                      # Business logic layer
│   │   └── accountService.ts          # Account and transaction business logic
│   ├── controllers/                   # Request handling layer
│   │   └── accountController.ts       # API endpoint controllers
│   └── routes/                        # API routing
│       └── accountRoutes.ts           # Account-related API routes
├── dist/                              # Compiled JavaScript output (generated)
├── database_schema.sql                # Database schema with tables, functions, and triggers
├── dummy_data.sql                     # Sample data for testing and development
├── docker-compose.yaml                # Docker setup for PostgreSQL
├── test_concurrent_withdrawals.sh     # Concurrent transaction testing script
├── tsconfig.json                      # TypeScript configuration
├── eslint.config.js                   # ESLint v9 configuration for TypeScript
├── package.json                       # Node.js dependencies and TypeScript scripts
├── package-lock.json                  # Locked dependency versions
└── README.md                          # This documentation file
```

## 🎯 Architecture Overview

This project follows a **layered architecture pattern** with clear separation of concerns:

### **API Layer (Express.js)**

- **Routes** (`src/routes/`): Define API endpoints and HTTP methods
- **Controllers** (`src/controllers/`): Handle HTTP requests/responses and validation
- **Middleware**: Error handling, logging, and request processing

### **Business Logic Layer**

- **Services** (`src/services/`): Implement business rules and transaction logic
- **Transaction Management**: Ensure ACID properties for financial operations
- **Validation**: Business rule validation and error handling

### **Data Access Layer**

- **Repositories** (`src/repositories/`): Abstract database operations
- **Connection Pool** (`src/database/`): Manage PostgreSQL connections
- **Query Management**: Prepared statements and SQL operations

### **Database Layer**

- **Schema** (`database_schema.sql`): Tables, constraints, functions, and triggers
- **Sample Data** (`dummy_data.sql`): Test data for development
- **Indexes**: Optimized for banking operation queries

## 🏛️ TypeScript Architecture Deep Dive

### **File Structure Explanation**

#### **`src/index.ts` - Application Entry Point**

- Sets up Express server and middleware
- Configures routes and error handling
- Manages database connection pool
- Handles graceful server shutdown

#### **`src/database/connection.ts` - Database Connection Pool**

```typescript
// Manages PostgreSQL connection pool with TypeScript types
import { Pool, PoolConfig } from "pg";

const poolConfig: PoolConfig = {
  user: "postgres",
  host: "localhost",
  database: "banking_system",
  password: "password",
  port: 5432,
  max: 20, // Maximum connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const pool = new Pool(poolConfig);
```

#### **`src/repositories/` - Data Access Layer**

- **`accountRepository.ts`**: All account and transaction database operations
- **`transactionRepository.ts`**: Transaction queries and utilities
- **Purpose**: Handle ALL database operations including complex transactions
- **Pattern**: Repository pattern with transaction management and strict typing

```typescript
// Example repository method - handles complete database transaction with TypeScript
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

    // Get balances with row locks
    const fromBalance = await this.getAccountBalance(fromAccountId, client);
    const toBalance = await this.getAccountBalance(toAccountId, client);

    // Validate and calculate new balances
    if (fromBalance < amount) {
      throw new InsufficientFundsError("Insufficient funds");
    }

    // Update both accounts and create transaction records
    await this.updateBalance(fromAccountId, fromBalance - amount, client);
    await this.updateBalance(toAccountId, toBalance + amount, client);
    await this.createTransactionRecords(/* transaction data */, client);

    await client.query("COMMIT");
    return transactionResult;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
```

#### **`src/services/accountService.ts` - Business Logic Layer**

- **Business Logic**: Handles validation, transformation, and orchestration with type safety
- **Input Validation**: Validates request parameters and business rules
- **Data Transformation**: Formats data for API responses with proper typing
- **Repository Orchestration**: Coordinates calls to multiple repositories

```typescript
// Example service method - ONLY business logic, NO database operations
async transfer(transferData: TransferRequest): Promise<TransferResponse> {
  const { fromAccountId, toAccountId, amount, description } = transferData;

  // Business validation with TypeScript type checking
  if (fromAccountId === toAccountId) {
    throw new ValidationError("Cannot transfer to the same account");
  }

  if (!amount || amount <= 0) {
    throw new ValidationError("Amount must be greater than 0");
  }

  // Generate reference number
  const referenceNumber = await this.transactionRepository.generateReferenceNumber();

  // Delegate to repository (repository handles ALL database operations)
  const transaction = await this.accountRepository.processTransfer(
    fromAccountId, toAccountId, amount, description, referenceNumber
  );

  // Transform and return response with proper typing
  return this._formatTransactionResponse(transaction);
}
```

#### **`src/controllers/accountController.ts` - Request Handlers**

- **HTTP Request/Response**: Handles Express.js routing with TypeScript types
- **Input Validation**: Validates incoming request data with type safety
- **Status Codes**: Returns appropriate HTTP status codes
- **Error Formatting**: Formats errors for API responses

```typescript
// Example controller method with TypeScript
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

    const result = await accountService.deposit(
      accountIdNum,
      parseFloat(amount),
      description ?? "Deposit"
    );

    res.status(StatusCodes.OK).json({
      success: true,
      data: result,
      message: "Deposit completed successfully",
    });
  } catch (error) {
    this.handleControllerError(error, res);
  }
}
```

#### **`src/routes/accountRoutes.ts` - API Route Definitions**

- **Route Mapping**: Maps HTTP methods to controller functions with TypeScript
- **Middleware**: Applies validation and authentication middleware
- **Path Parameters**: Defines URL parameters and structure

```typescript
// Example route definitions with TypeScript
import { Router } from "express";
import accountController from "../controllers/accountController";

const router = Router();

router.post("/:id/deposit", accountController.deposit);
router.post("/:id/withdraw", accountController.withdraw);
router.post("/:id/transfer", accountController.transfer);

export default router;
```

### **Key Design Patterns**

1. **Repository Pattern**: Separates data access from business logic
2. **Service Layer Pattern**: Encapsulates business logic and transactions
3. **MVC Pattern**: Model-View-Controller for API structure
4. **Dependency Injection**: Services depend on repositories, not database directly
5. **Connection Pooling**: Efficient database connection management

### **Transaction Safety Features**

- **Database Transactions**: All financial operations use PostgreSQL transactions
- **Pessimistic Locking**: Row-level locking for concurrent operations
- **Balance Validation**: Prevents overdrafts and negative balances
- **Atomic Operations**: All-or-nothing transaction processing
- **Rollback on Error**: Automatic rollback on any operation failure

## 📋 Features

### **Banking Operations**

- **User Management**: Store customer information with personal details
- **Multi-Account Support**: Users can have multiple accounts (checking, savings, business)
- **Transaction Tracking**: Complete audit trail of all financial operations
- **Transfer Operations**: Support for account-to-account transfers
- **Balance Validation**: Automatic balance checks and constraints
- **Account Status Management**: Active, suspended, and closed account states
- **Automatic Timestamps**: Auto-updating created_at and updated_at fields
- **Unique Account Numbers**: Automatic generation of unique account numbers

### **TypeScript Features**

- **🔒 Strict Type Safety**: Full type coverage with `strictNullChecks` and `exactOptionalPropertyTypes`
- **📝 Comprehensive Interfaces**: Detailed type definitions for all entities and DTOs
- **🛡️ Custom Error Classes**: Typed error handling with specific banking errors
- **🔍 Type Guards**: Runtime type validation with compile-time guarantees
- **📊 Generic Types**: Reusable type-safe components and API responses
- **⚡ Auto-completion**: Full IntelliSense support for better developer experience
- **🧪 Type-Driven Development**: Interfaces-first approach ensuring consistency

## 🚀 Getting Started

### Prerequisites

- **Docker** and **Docker Compose** installed
- **Node.js** 22+ and npm installed
- Basic knowledge of TypeScript, SQL, and REST APIs

### 🐳 Docker Setup (Recommended)

This is the easiest way to get started with the complete banking system including PostgreSQL and pgAdmin.

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd postgress-transaction-eg
   ```

2. **Start all services with Docker Compose:**

   ```bash
   docker-compose up -d
   ```

   This will start:

   - **PostgreSQL** on port `5432`
   - **pgAdmin** on port `8080`

3. **Access pgAdmin for database management:**

   - Open your browser and go to: http://localhost:8080
   - **Login credentials:**
     - Email: `admin@admin.com`
     - Password: `admin`

4. **Connect to PostgreSQL in pgAdmin:**

   - Click "Add New Server" in pgAdmin
   - **General Tab:** Name: `Banking System`
   - **Connection Tab:**
     - Host: `postgres` (Docker container name)
     - Port: `5432`
     - Database: `mydatabase`
     - Username: `myuser`
     - Password: `mypassword`
   - Click "Save"

5. **Create the banking_system database:**

   - Right-click on your server → Create → Database
   - Name: `banking_system`
   - Click "Save"

6. **Set up the database schema in pgAdmin:**

   - Right-click on `banking_system` database → Query Tool
   - Copy and paste the content of `database_schema.sql`
   - Execute the script (F5 or click Execute button)

7. **Load sample data (optional):**

   - In the same Query Tool, copy and paste the content of `dummy_data.sql`
   - Execute the script

8. **Update database connection for the API:**
   Edit `src/database/connection.ts` to match Docker settings:

   ```typescript
   import { Pool, PoolConfig } from "pg";

   const poolConfig: PoolConfig = {
     user: "myuser",
     host: "localhost", // Use 'localhost' when running API outside Docker
     database: "banking_system",
     password: "mypassword",
     port: 5432,
   };

   const pool = new Pool(poolConfig);
   ```

9. **Install Node.js dependencies:**

   ```bash
   npm install

   ```

10. **Start the TypeScript API server:**

    ```bash
    # Development with hot reload
    npm run dev

    # Build and start production
    npm run build
    npm start

    # Type checking only
    npm run type-check

    # Linting
    npm run lint
    ```

11. **Test the API:**
    ```bash
    curl http://localhost:3000/api/accounts
    ```

### 🌐 Access URLs

Once everything is running, you can access:

- **Banking API**: http://localhost:3000
- **pgAdmin (Database Management)**: http://localhost:8080
- **PostgreSQL Direct Connection**: `localhost:5432`

### 📋 Docker Services Overview

| Service     | Container     | Port | Purpose                |
| ----------- | ------------- | ---- | ---------------------- |
| PostgreSQL  | `my-postgres` | 5432 | Database server        |
| pgAdmin     | `pgadmin`     | 8080 | Database management UI |
| Banking API | -             | 3000 | REST API server        |

### 🛠️ Docker Management Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View service logs
docker-compose logs postgres
docker-compose logs pgadmin

# Restart services
docker-compose restart

# Remove all containers and volumes (CAUTION: This deletes all data!)
docker-compose down -v
```

## 🌐 API Endpoints

The banking API provides the following endpoints:

### **Account Management**

- `GET /api/accounts/user/:userId` - Get all accounts for a user
- `GET /api/accounts/:accountId` - Get specific account details
- `POST /api/accounts/create` - Create new account

### **Transaction Operations**

- `POST /api/accounts/:accountId/deposit` - Deposit money to account
- `POST /api/accounts/:accountId/withdraw` - Withdraw money from account
- `POST /api/accounts/:accountId/transfer` - Transfer money between accounts

### **Account Information**

- `GET /api/accounts/:accountId/balance` - Get current account balance
- `GET /api/accounts/:accountId/transactions` - Get transaction history (with pagination)
- `GET /api/accounts/:accountId/summary` - Get monthly transaction summary

### **Example API Usage**

```bash
# Create a new account
curl -X POST http://localhost:3000/api/accounts/create \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "accountType": "checking", "initialBalance": 1000.00}'

# Make a deposit
curl -X POST http://localhost:3000/api/accounts/1/deposit \
  -H "Content-Type: application/json" \
  -d '{"amount": 500.00, "description": "Salary deposit"}'

# Transfer money between accounts
curl -X POST http://localhost:3000/api/accounts/1/transfer \
  -H "Content-Type: application/json" \
  -d '{"toAccountId": 2, "amount": 200.00, "description": "Transfer to savings"}'

# Check account balance
curl http://localhost:3000/api/accounts/1/balance

# Get transaction history with pagination
curl "http://localhost:3000/api/accounts/1/transactions?limit=10&offset=0"

# Get monthly transaction summary
curl "http://localhost:3000/api/accounts/1/summary?year=2024&month=3"

# Get all accounts for a user
curl http://localhost:3000/api/accounts/user/1
```

## 🧪 Testing

### **Concurrent Transaction Testing**

The project includes a bash script to test concurrent withdrawal operations:

```bash
# Run concurrent withdrawal test
./test_concurrent_withdrawals.sh
```

This script:

- Creates test accounts with initial balances
- Runs multiple simultaneous withdrawal operations
- Verifies transaction safety and data consistency
- Tests that concurrent operations don't cause race conditions

### **Manual Testing Examples**

```bash
# Test account creation
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "accountType": "checking", "initialBalance": 1000.00}'

# Test concurrent deposits (run multiple times simultaneously)
curl -X POST http://localhost:3000/api/accounts/1/deposit \
  -H "Content-Type: application/json" \
  -d '{"amount": 100.00, "description": "Test deposit"}' &

# Verify final balance consistency
curl http://localhost:3000/api/accounts/1/balance
```

### **Database Testing**

```sql
-- Test balance constraints
INSERT INTO accounts (user_id, account_number, account_type, balance)
VALUES (1, '1234567890', 'checking', -100.00); -- Should fail

-- Test transaction consistency
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
INSERT INTO transactions (account_id, transaction_type, amount, balance_before, balance_after, description)
VALUES (1, 'withdrawal', 100.00, 1000.00, 900.00, 'Test withdrawal');
COMMIT;
```

## 🚨 Important Notes

### Transaction Consistency

When performing transfers or any operation that affects account balances:

1. **Always update account balances** after inserting transaction records
2. **Use database transactions** to ensure consistency
3. **Validate balances** before allowing withdrawals
4. **Generate unique reference numbers** for transaction tracking

### Example Transaction Block

```sql
BEGIN;

-- Record the transaction
INSERT INTO transactions (account_id, transaction_type, amount, balance_before, balance_after, description)
VALUES (1, 'withdrawal', 100.00, 1500.00, 1400.00, 'ATM withdrawal');

-- Update account balance
UPDATE accounts SET balance = 1400.00 WHERE id = 1;

COMMIT;
```

## 📈 Sample Data

The `dummy_data.sql` file contains realistic sample data including:

- **3 Users**: John Doe, Jane Smith, and Robert Johnson
- **6 Accounts**: Mix of checking, savings, and business accounts
- **8 Transactions**: Various transaction types including transfers

This sample data demonstrates real-world scenarios and can be used for testing and development.

## 🔒 Security Considerations

While this is a demonstration database, in production you should consider:

- **Encryption**: Encrypt sensitive data at rest and in transit
- **Access Control**: Implement proper user roles and permissions
- **Audit Logging**: Enhanced logging for compliance requirements
- **Input Validation**: Validate all inputs to prevent SQL injection
- **Rate Limiting**: Implement transaction rate limiting
- **Multi-factor Authentication**: For account access

## 📄 License

This project is provided as-is for educational and demonstration purposes.

---

**Happy Banking! 🏦**
