import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  asyncAuthHandler,
  asyncHandler,
} from "../middlewares/asyncHandler.middleware";
import {
  addToCart,
  clearCart,
  getCart,
  removeFromCart,
} from "../controllers/cart.controller";

const cartRoutes = express.Router();

cartRoutes.get("/cart", authMiddleware, asyncAuthHandler(getCart));
cartRoutes.post("/cart", authMiddleware, asyncAuthHandler(addToCart));
cartRoutes.delete(
  "/cart/remove/:id",
  authMiddleware,
  asyncAuthHandler(removeFromCart)
);
cartRoutes.delete("/cart/clear", authMiddleware, asyncAuthHandler(clearCart));

export default cartRoutes;
