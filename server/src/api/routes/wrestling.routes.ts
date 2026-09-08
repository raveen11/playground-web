import { Router, type Router as ExpressRouter, type RequestHandler } from "express";
import {
  getAllWrestlers,
  getUsersWithCards,
  assignDefaultCardsToUser,
} from "../../services/wrestling.service.js";

export const wrestlingRouter: ExpressRouter = Router();

/**
 * GET /api/wrestling/wrestlers
 * Returns all wrestlers in the database.
 */
const getWrestlersHandler: RequestHandler = async (_req, res) => {
  try {
    const wrestlers = await getAllWrestlers();
    res.json(wrestlers);
  } catch (error) {
    console.error("Failed to get wrestlers:", error);
    res.status(500).json({ message: "Failed to get wrestlers" });
  }
};

/**
 * GET /api/wrestling/users
 * Returns all users with their cardList (20 default wrestling cards).
 */
const getUsersWithCardsHandler: RequestHandler = async (_req, res) => {
  try {
    const users = await getUsersWithCards();
    res.json(users);
  } catch (error) {
    console.error("Failed to get users with cards:", error);
    res.status(500).json({ message: "Failed to get users with cards" });
  }
};

/**
 * POST /api/wrestling/assign-default/:userId
 * Ensures the specified user has 20 default wrestling cards.
 */
const assignDefaultHandler: RequestHandler = async (req, res) => {
  try {
    const rawUserId = req.params.userId;
    const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
    if (!userId || typeof userId !== "string") {
      res.status(400).json({ message: "userId is required" });
      return;
    }
    const cards = await assignDefaultCardsToUser(userId);
    res.json({ message: "Default cards assigned", cardsCount: cards.length, cards });
  } catch (error) {
    console.error("Failed to assign default cards:", error);
    res.status(500).json({ message: "Failed to assign default cards" });
  }
};

wrestlingRouter.get("/wrestlers", getWrestlersHandler);
wrestlingRouter.get("/users", getUsersWithCardsHandler);
wrestlingRouter.post("/assign-default/:userId", assignDefaultHandler);
