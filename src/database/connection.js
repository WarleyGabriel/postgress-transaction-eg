const { Pool } = require("pg");

const pool = new Pool({
  user: "myuser",
  host: "localhost",
  database: "mydatabase",
  password: "mypassword",
  port: 5432,
  // Connection pool configuration
  max: 20, // Maximum number of clients in the pool
  min: 2, // Minimum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait when connecting a new client
});

let connectionCount = 0;

// Better logging for connection events
pool.on("connect", (client) => {
  connectionCount++;
  console.log(`📗 NEW database connection established (#${connectionCount})`);
  console.log(
    `📊 Pool status: total=${pool.totalCount}, idle=${pool.idleCount}, waiting=${pool.waitingCount}`
  );
});

pool.on("acquire", (client) => {
  // This fires when a client is acquired from the pool (reused or new)
  console.log(
    `📘 Connection acquired from pool (total=${pool.totalCount}, idle=${pool.idleCount})`
  );
});

pool.on("release", (client) => {
  // This fires when a client is released back to the pool
  console.log(
    `📙 Connection released back to pool (total=${pool.totalCount}, idle=${pool.idleCount})`
  );
});

pool.on("error", (err) => {
  console.error("❌ Database pool error:", err);
});

pool.on("remove", (client) => {
  connectionCount--;
  console.log(
    `📕 Connection removed from pool (#${connectionCount} remaining)`
  );
});

// Test initial connection
(async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Database pool initialized successfully");
    client.release();
  } catch (err) {
    console.error("❌ Failed to initialize database pool:", err);
  }
})();

module.exports = pool;
