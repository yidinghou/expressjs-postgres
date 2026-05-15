import bodyParser from "body-parser";
import express from "express";
import pg from "pg";

// Debug: Log environment variables
console.log("DATABASE_URL:", process.env.DATABASE_URL || "NOT SET");
console.log("NODE_ENV:", process.env.NODE_ENV || "NOT SET");
console.log("PORT:", process.env.PORT || "NOT SET");

// Connect to the database using the DATABASE_URL environment
//   variable injected by Railway
const pool = new pg.Pool();

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
