import express from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import {
  addProduct,
  addToWishList,
  getAllProducts,
  getProductBySlug,
  getSingleProduct,
  getWishlist,
  removeFromWishList,
} from "../controllers/product.controller";
import {
  adminMiddleware,
  authMiddleware,
} from "../middlewares/auth.middleware";

const productRoutes = express.Router();

productRoutes.get("/products", asyncHandler(getAllProducts));

productRoutes.get("/products/:slug", asyncHandler(getProductBySlug));

productRoutes.get("/products/:id", asyncHandler(getSingleProduct));

productRoutes.post("/products/add", adminMiddleware, asyncHandler(addProduct));

productRoutes.get("/wishlist", authMiddleware, asyncHandler(getWishlist));

productRoutes.post(
  "/wishlist/add",
  authMiddleware,
  asyncHandler(addToWishList)
);

productRoutes.delete(
  "/wishlist/remove/:id",
  authMiddleware,
  asyncHandler(removeFromWishList)
);

export default productRoutes;
