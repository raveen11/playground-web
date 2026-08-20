
import { Router } from "express";
import pool from "../config/database.js";

const router: Router = Router();

router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM documents"
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch users",
    });
  }
});

export default router;