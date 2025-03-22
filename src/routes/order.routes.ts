import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  asyncAuthHandler,
  asyncHandler,
} from "../middlewares/asyncHandler.middleware";
import {
  checkOrderStatus,
  checkOrderStatusAndVerifyPayment,
  checkout,
  createOrder,
  getOrders,
  getSingleOrder,
  paystackWebhook,
  verifyPayment,
} from "../controllers/order.controller";

const orderRoutes = express.Router();

orderRoutes.get("/orders", authMiddleware, asyncAuthHandler(getOrders));

orderRoutes.get(
  "/orders/status/:id",
  authMiddleware,
  asyncAuthHandler(checkOrderStatusAndVerifyPayment)
);

orderRoutes.post(
  "/webhook/paystack",
  authMiddleware,
  asyncAuthHandler(paystackWebhook)
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
