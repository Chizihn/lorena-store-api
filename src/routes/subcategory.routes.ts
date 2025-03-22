import express from "express";
import { adminMiddleware } from "../middlewares/auth.middleware";
import {
  asyncAuthHandler,
  asyncHandler,
} from "../middlewares/asyncHandler.middleware";
import {
  createSubcategory,
  deleteSubcategory,
  getSubcategories,
  updateSubcategory,
} from "../controllers/subcategory.controller";

const subcategoryRoutes = express.Router();

// POST: Create a new subcategory
subcategoryRoutes.post(
  "/subcategory",
  adminMiddleware,
  asyncAuthHandler(createSubcategory)
);

subcategoryRoutes.put(
  "/subcategory/:id",
  adminMiddleware,
  asyncAuthHandler(updateSubcategory)
);

subcategoryRoutes.delete(
  "/subcategory/:id",
  adminMiddleware,
  asyncAuthHandler(deleteSubcategory)
);

// GET: List all subcategories
subcategoryRoutes.get("/subcategory", asyncHandler(getSubcategories));

export default subcategoryRoutes;
