import express from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import {
  createAccountHandler,
  forgotPasswordHandler,
  loginHandler,
  resetPasswordHandler,
  updateProfileHandler,
} from "../controllers/auth.controller";
import {
  adminMiddleware,
  authMiddleware,
} from "../middlewares/auth.middleware";

const router = express.Router();

router.post("/create-account", asyncHandler(createAccountHandler));

router.post("/login", asyncHandler(loginHandler));

router.post("/forgot-password", asyncHandler(forgotPasswordHandler));

router.post("/reset-password", asyncHandler(resetPasswordHandler));

router.put(
  "/users/:id/update-profile",
  authMiddleware,
  adminMiddleware,
  asyncHandler(updateProfileHandler)
);

export default router;
