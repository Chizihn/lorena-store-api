import express from "express";
import {
  asyncAuthHandler,
  asyncHandler,
} from "../middlewares/asyncHandler.middleware";
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

productRoutes.get("/wishlist", authMiddleware, asyncAuthHandler(getWishlist));

productRoutes.post(
  "/wishlist/add",
  authMiddleware,
  asyncAuthHandler(addToWishList)
);

productRoutes.delete(
  "/wishlist/remove/:id",
  authMiddleware,
  asyncAuthHandler(removeFromWishList)
);

export default productRoutes;
