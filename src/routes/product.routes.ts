import express from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import {
  addProduct,
  getAllProducts,
  getProductBySlug,
  getSingleProduct,
} from "../controllers/product.controller";
import { adminMiddleware } from "../middlewares/auth.middleware";

const productRoutes = express.Router();

productRoutes.get("/products", asyncHandler(getAllProducts));

productRoutes.get("/products/:slug", asyncHandler(getProductBySlug));

productRoutes.get("/products/:id", asyncHandler(getSingleProduct));

productRoutes.post("/products/add", adminMiddleware, asyncHandler(addProduct));

export default productRoutes;
