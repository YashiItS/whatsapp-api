"use strict";

require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

const schemaPath = path.join(__dirname, "schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf8");

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL is required to run migrations.");
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("render") ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    await client.query(schemaSql);
    console.log("Database migration complete.");
  } catch (error) {
    console.error("Migration failed:", error.message || error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
