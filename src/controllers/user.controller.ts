import { NextFunction, Request, Response } from "express";
import {
  NotFoundException,
  UnauthorizedException,
  ZodValidationException,
} from "../utils/appError";
import { UpdateProfileSchema } from "../validators/auth.validator";
import { HTTPSTATUS } from "../config/http.config";
import UserModel from "../models/user.model";

import { ErrorCodeEnum } from "../enums/error-code.enum";
import { AuthenticatedRequest } from "../types/custom.type";

import { ZodError } from "zod";
import AccountModel from "../models/account.model";
import { RolesEnum } from "../enums/roles.enum";

export const updateProfileHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Parse and validate the request body
    const validatedData = UpdateProfileSchema.parse(req.body);

    // Get the user ID from the authenticated request
    const userId = req.user?._id;

    if (!userId) {
      throw new UnauthorizedException(
        "User not authenticated",
        ErrorCodeEnum.ACCESS_UNAUTHORIZED
      );
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      validatedData,
      { new: true }
    );

    if (!updatedUser) {
      throw new NotFoundException(
        "No user found",
        ErrorCodeEnum.AUTH_USER_NOT_FOUND
      );
    }

    // Return success response
    return res.status(HTTPSTATUS.OK).json({
      message: "User profile updated successfully",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new ZodValidationException(error));
      return;
    }

    next(error);
  }
};

export const fetchUserProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;
    console.log("userid", userId);

    // Find the user with UserModel
    const user = await UserModel.findById(userId).select(
      "-password -emailVerificationToken -emailVerificationTokenExpires -passwordResetToken -passwordResetTokenExpires "
    );
    if (!user) {
      throw new NotFoundException(
        "No such user",
        ErrorCodeEnum.AUTH_USER_NOT_FOUND
      );
    }

    const accountInfo = await AccountModel.findOne({ userId: userId });

    // Combine the information
    const userProfile = {
      ...user.toObject(),
      providerInfo: accountInfo ? accountInfo.toObject() : null,
    };

    return res.status(200).json(userProfile);
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const users = await UserModel.find({
      role: { $nin: [RolesEnum.ADMIN, RolesEnum.MANAGER] },
    });

    if (!users) {
      throw new NotFoundException(
        "There are no users yet",
        ErrorCodeEnum.NOT_FOUND
      );
    }

    return res.status(HTTPSTATUS.OK).json(users);
  } catch (error) {
    next(error);
  }
};

export const getUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const user = await UserModel.findById(id);

    if (!user) {
      throw new NotFoundException("User not found", ErrorCodeEnum.NOT_FOUND);
    }

    return res.status(HTTPSTATUS.OK).json(user);
  } catch (error) {
    next(error);
  }
};
