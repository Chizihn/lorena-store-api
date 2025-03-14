import { NextFunction, Request, Response } from "express";
import { NotFoundException, ZodValidationException } from "../utils/appError";
import { UpdateProfileSchema } from "../validators/auth.validator";
import { HTTPSTATUS } from "../config/http.config";
import UserModel from "../models/user.model";

import { ErrorCodeEnum } from "../enums/error-code.enum";
import { AuthenticatedRequest } from "../@types/custom.type";
import { ZodError } from "zod";
import AccountModel from "../models/account.model";

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

    // If user ID is not available, respond with unauthorized error
    if (!userId) {
      return res.status(HTTPSTATUS.UNAUTHORIZED).json({
        message: "User not authenticated",
      });
    }

    // Find the user by ID
    const user = await UserModel.findById(userId);

    // If the user is not found, return a not found error
    if (!user) {
      return res
        .status(HTTPSTATUS.NOT_FOUND)
        .json({ message: ErrorCodeEnum.AUTH_USER_NOT_FOUND });
    }

    // Log the validated data to check what is being updated
    console.log("Validated data:", validatedData);

    // Update the user object with the new data
    Object.assign(user, validatedData);

    // Save the updated user profile
    await user.save();

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
    const { token } = req.query;
    const userId = req.user?._id;

    if (!token) {
      throw new NotFoundException(
        "No such user",
        ErrorCodeEnum.AUTH_TOKEN_NOT_FOUND
      );
    }

    if (!userId) {
      throw new NotFoundException(
        "No such user",
        ErrorCodeEnum.AUTH_USER_NOT_FOUND
      );
    }

    // Find the user and populate the 'account' field
    const user = await AccountModel.findOne({ userId: userId }).populate(
      "user"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};
