import { Router } from "express";
import { adminMiddleware } from "../middlewares/auth.middleware";
import { asyncAuthHandler } from "../middlewares/asyncHandler.middleware";
import { getOrderStatistics } from "../controllers/stat.controller";

const statRoutes = Router();

statRoutes.get("/stats", adminMiddleware, asyncAuthHandler(getOrderStatistics));

export default statRoutes;
