import bodyParser from "body-parser";
import express from "express";
import pg from "pg";

console.log("=== APP STARTUP ===");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "SET" : "NOT SET");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", process.env.PORT);

// Connect to the database using DATABASE_URL from Railway
const dbUrl = process.env.DATABASE_URL;
console.log("Using connection string:", dbUrl ? "✓" : "✗ MISSING");

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

const app = express();
const port = process.env.PORT || 3333;

app.use(bodyParser.json());
app.use(bodyParser.raw({ type: "application/vnd.custom-type" }));
app.use(bodyParser.text({ type: "text/html" }));

app.get("/", async (req, res) => {
  const { rows } = await pool.query("SELECT NOW()");
  res.send(`Hello, World! The time from the DB is ${rows[0].now}`);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
