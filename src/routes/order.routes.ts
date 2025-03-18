import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  asyncAuthHandler,
  asyncHandler,
} from "../middlewares/asyncHandler.middleware";
import {
  checkout,
  createOrder,
  getOrders,
  getSingleOrder,
  verifyPayment,
} from "../controllers/order.controller";

const orderRoutes = express.Router();

orderRoutes.get("/orders", authMiddleware, asyncAuthHandler(getOrders));
orderRoutes.get(
  "/orders/verify/:id",
  authMiddleware,
  asyncAuthHandler(verifyPayment)
);

orderRoutes.get(
  "/orders/:id",
  authMiddleware,
  asyncAuthHandler(getSingleOrder)
);

orderRoutes.post(
  "/orders/create",
  authMiddleware,
  asyncAuthHandler(createOrder)
);
orderRoutes.put("/checkout", authMiddleware, asyncAuthHandler(checkout));

export default orderRoutes;
