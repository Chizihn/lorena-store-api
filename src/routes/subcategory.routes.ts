import express from "express";
import { adminMiddleware } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import {
  createSubcategory,
  getSubcategories,
} from "../controllers/subcategory.controller";

const subcategoryRoutes = express.Router();

// POST: Create a new subcategory
subcategoryRoutes.post(
  "/subcategories",
  adminMiddleware,
  asyncHandler(createSubcategory)
);

// GET: List all subcategories
subcategoryRoutes.get("/subcategories", asyncHandler(getSubcategories));

export default subcategoryRoutes;
