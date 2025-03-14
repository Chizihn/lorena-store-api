import express from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import {
  createAccountHandler,
  forgotPasswordHandler,
  loginHandler,
  resetPasswordHandler,
  verifyEmailHandler,
} from "../controllers/auth.controller";


const router = express.Router();

router.post("/create-account", asyncHandler(createAccountHandler));

router.post("/login", asyncHandler(loginHandler));

router.post("/verify-email", asyncHandler(verifyEmailHandler));


router.post("/forgot-password", asyncHandler(forgotPasswordHandler));

router.post("/reset-password", asyncHandler(resetPasswordHandler));



export default router;
