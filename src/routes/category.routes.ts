import express from "express";

import { adminMiddleware } from "../middlewares/auth.middleware";
import {
  createCategory,
  getCategories,
} from "../controllers/category.controller";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";

const categoryRoutes = express.Router();

categoryRoutes.post(
  "/categories/add",
  adminMiddleware,
  asyncHandler(createCategory)
);

// GET: List all categories
categoryRoutes.get("/categories", asyncHandler(getCategories));

export default categoryRoutes;
