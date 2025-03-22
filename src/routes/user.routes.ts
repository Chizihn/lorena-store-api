import express from "express";
import {
  adminMiddleware,
  authMiddleware,
} from "../middlewares/auth.middleware";
import {
  asyncAuthHandler,
  asyncHandler,
} from "../middlewares/asyncHandler.middleware";
import {
  fetchUserProfile,
  getUser,
  getUsers,
  updateProfileHandler,
} from "../controllers/user.controller";

const userRoutes = express.Router();

userRoutes.put(
  "/users/:id/update-profile",
  authMiddleware,
  adminMiddleware,
  asyncAuthHandler(updateProfileHandler)
);

userRoutes.get("/users/me", authMiddleware, asyncAuthHandler(fetchUserProfile));

userRoutes.get("/users", adminMiddleware, asyncAuthHandler(getUsers));

userRoutes.get("/users/:id", adminMiddleware, asyncAuthHandler(getUser));

export default userRoutes;
