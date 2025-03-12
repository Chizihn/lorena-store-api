import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../@types/custom.type";
import { AppError } from "../utils/appError";
import jwt from "jsonwebtoken";
import { HTTPSTATUS } from "../config/http.config";
import { config } from "../config/app.config";
import { UserDocument } from "../interfaces/user.interface";
import UserModel from "../models/user.model";
import { RolesEnum, RolesEnumType } from "../enums/roles.enum";

const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(HTTPSTATUS.UNAUTHORIZED).json({
      message: "Unauthorized - no token provided",
    });
  }
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string };

    if (!decoded.userId) {
      return res.status(HTTPSTATUS.UNAUTHORIZED).json({
        message: "Unauthorized - invalid token",
      });
    }

    const user: UserDocument | null = await UserModel.findById(
      decoded.userId
    ).select(
      "-password passwordResetToken passwordResetTokenExpires comparePassword omitPassword"
    );

    if (!user) {
      return res.status(HTTPSTATUS.NOT_FOUND).json({
        message: "Unauthorized - user not found",
      });
    }
    req.user = user;
    console.log("LOgged user", user);

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        message: error.message,
        errorCode: error.errorCode,
      });
    }
  }
};

const adminMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(HTTPSTATUS.UNAUTHORIZED).json({
        message: "Unauthorized - no token provided",
      });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string };
    if (!decoded || !decoded.userId) {
      return res.status(HTTPSTATUS.UNAUTHORIZED).json({
        message: "Unauthorized - invalid token",
      });
    }

    const user: UserDocument | null = await UserModel.findById(
      decoded.userId
    ).select("-password");

    if (!user) {
      return res.status(HTTPSTATUS.NOT_FOUND).json({
        message: "Unauthorized - user not found",
      });
    }

    req.user = user;

    if (!req.user) {
      return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
        message: "Internal Server Error - User not set in request",
      });
    }

    const allowedRoles = [RolesEnum.MANAGER, RolesEnum.ADMIN];
    // Check if user has any of the allowed roles
    const hasAdminAccess = Array.isArray(user.role)
      ? user.role.some((role) => allowedRoles.includes(role as RolesEnumType))
      : allowedRoles.includes(user.role as RolesEnumType);

    if (!hasAdminAccess) {
      return res.status(HTTPSTATUS.FORBIDDEN).json({
        message: "Forbidden - you are not an admin",
      });
    }

    next();
  } catch (error) {
    console.error("Error in adminMiddleware:", error);
    return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
      message: "Internal Server Error",
    });
  }
};
export { authMiddleware, adminMiddleware };
