import express from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import {
  createAccountHandler,
  fetchUserByToken,
  forgotPasswordHandler,
  googleAuthCallback,
  googleLoginHandler,
  loginHandler,
  resendResetPasswordToken,
  resetPasswordHandler,
  verifyEmailHandler,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = express.Router();

router.post("/create-account", asyncHandler(createAccountHandler));

router.post("/login", asyncHandler(loginHandler));

// router.get("/users/me", authMiddleware, asyncAuthHandler(fetchUserByToken));

router.post("/google", asyncHandler(googleLoginHandler));
router.get("/google/callback", googleAuthCallback);

router.post("/verify-email", asyncHandler(verifyEmailHandler));

router.post("/forgot-password", asyncHandler(forgotPasswordHandler));

router.post("/reset-password", asyncHandler(resetPasswordHandler));

router.post("/resend-reset-token", asyncHandler(resendResetPasswordToken));

export default router;
