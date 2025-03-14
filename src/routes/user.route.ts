import express from "express";
import {
  adminMiddleware,
  authMiddleware,
} from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import {
  fetchUserProfile,
  updateProfileHandler,
} from "../controllers/user.controller";

const userRoutes = express.Router();

userRoutes.put(
  "/users/:id/update-profile",
  authMiddleware,
  adminMiddleware,
  asyncHandler(updateProfileHandler)
);

userRoutes.get("/users/:id", authMiddleware, asyncHandler(fetchUserProfile));

export default userRoutes;
