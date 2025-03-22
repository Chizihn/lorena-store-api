import express from "express";
import {
  asyncAuthHandler,
  asyncHandler,
} from "../middlewares/asyncHandler.middleware";
import {
  createAccountHandler,
  forgotPasswordHandler,
  googleAuthCallback,
  googleLoginHandler,
  loginHandler,
  resendResetPasswordToken,
  resendVerifyEmailToken,
  resetPasswordHandler,
  verifyEmailHandler,
} from "../controllers/auth.controller";

const router = express.Router();

router.post("/create-account", asyncHandler(createAccountHandler));

router.post("/login", asyncHandler(loginHandler));

// router.get("/users/me", authMiddleware, asyncAuthHandler(fetchUserByToken));

router.post("/google", asyncHandler(googleLoginHandler));
router.get("/google/callback", googleAuthCallback);

router.post("/verify-email", asyncAuthHandler(verifyEmailHandler));
router.post("/resend-verify-token", asyncAuthHandler(resendVerifyEmailToken));

router.post("/forgot-password", asyncHandler(forgotPasswordHandler));

router.post("/reset-password", asyncHandler(resetPasswordHandler));

router.post("/resend-reset-token", asyncHandler(resendResetPasswordToken));

export default router;
