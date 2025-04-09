import express from "express";
import {
  asyncAuthHandler,
  asyncHandler,
} from "../middlewares/asyncHandler.middleware";
import {
  addProduct,
  addToWishList,
  deleteProduct,
  getProducts,
  getProductBySlug,
  getSingleProduct,
  getWishlist,
  removeFromWishList,
  updateProduct,
} from "../controllers/product.controller";
import {
  adminMiddleware,
  authMiddleware,
} from "../middlewares/auth.middleware";

const productRoutes = express.Router();

productRoutes.get("/products", asyncHandler(getProducts));

productRoutes.get("/products/:slug", asyncHandler(getProductBySlug));

productRoutes.get("/products/:id", asyncHandler(getSingleProduct));

productRoutes.post("/products/add", adminMiddleware, asyncHandler(addProduct));
productRoutes.put(
  "/products/:id",
  adminMiddleware,
  asyncAuthHandler(updateProduct)
);

productRoutes.delete(
  "/products/:id",
  adminMiddleware,
  asyncAuthHandler(deleteProduct)
);

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
