import { NextFunction, Response, Request } from "express";
import { AuthenticatedRequest } from "../types/custom.type";

import jwt from "jsonwebtoken";
import { HTTPSTATUS } from "../config/http.config";
import { config } from "../config/app.config";
import { UserDocument } from "../interfaces/user.interface";
import UserModel from "../models/user.model";
import { RolesEnum, RolesEnumType } from "../enums/roles.enum";

// Using RequestHandler compatible signature, with type assertion inside the function
const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    res.status(HTTPSTATUS.UNAUTHORIZED).json({
      message: "Unauthorized - no token provided",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string };

    if (!decoded.userId) {
      res.status(HTTPSTATUS.UNAUTHORIZED).json({
        message: "Unauthorized - invalid token",
      });
      return;
    }

    const user: UserDocument | null = await UserModel.findById(
      decoded.userId
    ).select(
      "-password -passwordResetToken -passwordResetTokenExpires -comparePassword -omitPassword"
    );

    if (!user) {
      res.status(HTTPSTATUS.NOT_FOUND).json({
        message: "Unauthorized - user not found",
      });
      return;
    }

    (req as AuthenticatedRequest).user = user;

    next();
  } catch (error) {
    next(error);
  }
};

const adminMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(HTTPSTATUS.UNAUTHORIZED).json({
        message: "Unauthorized - no token provided",
      });
      return;
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string };
    if (!decoded || !decoded.userId) {
      res.status(HTTPSTATUS.UNAUTHORIZED).json({
        message: "Unauthorized - invalid token",
      });
      return;
    }

    const user: UserDocument | null = await UserModel.findById(
      decoded.userId
    ).select("-password");

    if (!user) {
      res.status(HTTPSTATUS.NOT_FOUND).json({
        message: "Unauthorized - user not found",
      });
      return;
    }

    // Type assertion here
    const authReq = req as AuthenticatedRequest;
    authReq.user = user;

    if (!authReq.user) {
      res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
        message: "Internal Server Error - User not set in request",
      });
      return;
    }

    const allowedRoles = [RolesEnum.MANAGER, RolesEnum.ADMIN];
    // Check if user has any of the allowed roles
    const hasAdminAccess = Array.isArray(user.role)
      ? user.role.some((role) => allowedRoles.includes(role as RolesEnumType))
      : allowedRoles.includes(user.role as RolesEnumType);

    if (!hasAdminAccess) {
      res.status(HTTPSTATUS.FORBIDDEN).json({
        message: "Forbidden - you are not an admin",
      });
      return;
    }

    next();
  } catch (error) {
    console.error("Error in adminMiddleware:", error);
    res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
      message: "Internal Server Error",
    });
    return;
  }
};

export { authMiddleware, adminMiddleware };
