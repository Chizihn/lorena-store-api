import express from "express";

import { adminMiddleware } from "../middlewares/auth.middleware";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "../controllers/category.controller";
import {
  asyncAuthHandler,
  asyncHandler,
} from "../middlewares/asyncHandler.middleware";

const categoryRoutes = express.Router();

categoryRoutes.post(
  "/category",
  adminMiddleware,
  asyncAuthHandler(createCategory)
);

categoryRoutes.put(
  "/category/:id",
  adminMiddleware,
  asyncAuthHandler(updateCategory)
);

categoryRoutes.delete(
  "/category/:id",
  adminMiddleware,
  asyncHandler(deleteCategory)
);

// GET: List all categories
categoryRoutes.get("/categories", asyncAuthHandler(getCategories));

export default categoryRoutes;
