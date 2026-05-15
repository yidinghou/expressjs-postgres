import bodyParser from "body-parser";
import express from "express";
import pg from "pg";

// Debug: Check if DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not set!");
  console.log("Available env vars:", Object.keys(process.env).filter(k => k.includes('RAIL') || k.includes('DATA') || k.includes('DB')));
}

// Connect to the database using DATABASE_URL from Railway
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
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
