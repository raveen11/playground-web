import pool from "../config/database.js";


export async function testDatabaseConnection() {
  try {
    const result = await pool.query("SELECT * FROM documents");
    console.log("PostgreSQL connected:", result.rows[0]);
  } catch (error) {
    console.error("PostgreSQL connection failed:", error);
  }
}