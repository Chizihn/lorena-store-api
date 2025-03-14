import { NextFunction, Request, Response } from "express";
import {
  AppError,
  BadRequestException,
  NotFoundException,
  ZodValidationException,
} from "../utils/appError";
import {
  CreateAccountSchema,
  LoginSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
} from "../validators/auth.validator";
import { HTTPSTATUS } from "../config/http.config";
import UserModel from "../models/user.model";
import {
  generateEmailVerificationToken,
  generateAuthToken,
  generateToken,
} from "../utils/token";
import { ErrorCodeEnum } from "../enums/error-code.enum";
import { compareValue, hashValue } from "../utils/bcrypt";
import { sendEmail } from "../utils/sendEmail";
import { ZodError } from "zod";
import AccountModel from "../models/account.model";
import { ProviderEnum } from "../enums/account-provider.enum";

export const createAccountHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = CreateAccountSchema.parse(req.body);

    const existingUser = await UserModel.findOne({
      email: validatedData.email,
    });

    if (existingUser) {
      throw new AppError(
        "User already exists with email",
        HTTPSTATUS.CONFLICT,
        ErrorCodeEnum.AUTH_EMAIL_ALREADY_EXISTS
      );
    }

    const verificationToken = generateEmailVerificationToken();
    const emailVerifyTokenExpires = new Date();
    emailVerifyTokenExpires.setHours(emailVerifyTokenExpires.getHours() + 1);

    const newUser = new UserModel({
      ...validatedData,
      emailVerificationToken: verificationToken,
      emailVerificationTokenExpires: emailVerifyTokenExpires,
    });

    const newAccount = await AccountModel.create({
      userId: newUser._id,
      provider: ProviderEnum.EMAIL,
      providerId: newUser.email,
    });

    const token = generateToken(newUser.id as string, res);

    await newUser.save();

    await sendEmail({
      to: newUser.email,
      subject: "Verify your email",
      text: `Please verify your email with this token. The token expires in an hour. ${verificationToken}`,
    });

    //Success

    return res.status(HTTPSTATUS.CREATED).json({
      message: "User account created successfully",
      token,
      user: newUser,
      acount: newAccount,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new ZodValidationException(error));
      return;
    }

    next(error);
  }
};

export const loginHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = LoginSchema.parse(req.body);

    const existingUser = await UserModel.findOne({
      email: validatedData.email,
    });

    const existingAccount = await AccountModel.findOne({
      provider: ProviderEnum.EMAIL,
      providerId: validatedData?.email,
    });

    if (!existingUser) {
      throw new NotFoundException("No such user", ErrorCodeEnum.AUTH_NOT_FOUND);
    }

    if (!existingAccount) {
      throw new NotFoundException(
        "No account with this user",
        ErrorCodeEnum.AUTH_NOT_FOUND
      );
    }

    const isPasswordCorrect = await compareValue(
      validatedData.password,
      existingUser.password as string
    );

    if (!isPasswordCorrect) {
      return res.status(HTTPSTATUS.BAD_REQUEST).json({
        message: "Invalid credentials",
      });
    }

    //generate token for user
    const token = generateToken(existingUser._id as string, res);
    console.log("token", token);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: existingUser,
      account: existingAccount,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new ZodValidationException(error));
      return;
    }

    next(error);
  }
};

export const verifyEmailHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = VerifyEmailSchema.parse(req.body);

    const user = await UserModel.findOne({
      emailVerificationToken: validatedData.token,
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid verification token" });
    }

    const emailVerificationToken = user.emailVerificationToken;
    const emailVerificationTokenExpires =
      user.emailVerificationTokenExpires as Date;

    if (!emailVerificationToken) {
      return res.status(HTTPSTATUS.BAD_REQUEST).json({
        message: "Invalid request. No token found!",
      });
    }

    if (new Date() > emailVerificationTokenExpires) {
      user.emailVerificationToken = null;
      user.emailVerificationTokenExpires = null;

      return res.status(HTTPSTATUS.BAD_REQUEST).json({
        message: "Verification token has expired request for a new token!",
      });
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationTokenExpires = null;

    await user.save();
    return res
      .status(HTTPSTATUS.OK)
      .json({ message: "Email verified successfully" });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new ZodValidationException(error));
      return;
    }

    next(error);
  }
};

export const resendVerifyEmailToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body; // Assuming email is provided in the request body

    // Find the user by email
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(HTTPSTATUS.BAD_REQUEST).json({
        message: "User not found",
      });
    }

    // Check if the user has a verification token
    if (user.emailVerificationToken) {
      // If the token exists, check if it has expired
      const emailVerificationTokenExpires =
        user.emailVerificationTokenExpires as Date;

      if (new Date() > emailVerificationTokenExpires) {
        // If the token has expired, generate a new one
        const newToken = generateEmailVerificationToken();
        const newExpirationDate = new Date();
        newExpirationDate.setHours(newExpirationDate.getHours() + 1); // Token expires in 1 hour

        // Update the user document with the new token and expiration date
        user.emailVerificationToken = newToken;
        user.emailVerificationTokenExpires = newExpirationDate;

        await user.save();

        // Send the new verification email
        await sendEmail({
          to: user.email,
          subject: "Resent new token",
          text: `Please use this token to verify your account. The token expires in an hour. ${newToken}`,
        });

        return res.status(HTTPSTATUS.OK).json({
          message:
            "Verification token expired. A new token has been sent to your email.",
        });
      } else {
        const timeLeft = getTimeLeftBeforeExpiration(
          emailVerificationTokenExpires
        );

        // If the token is still valid, resend the existing token
        await sendEmail({
          to: user.email,
          subject: "Verify your email",
          text: `Please verify your email with this token. The token expires in ${timeLeft}. ${user.emailVerificationToken}`,
        });
        return res.status(HTTPSTATUS.OK).json({
          message:
            "Verification token is still valid. A new token has been sent to your email.",
        });
      }
    } else {
      // If no token exists, generate a new one
      const newToken = generateEmailVerificationToken();
      const newExpirationDate = new Date();
      newExpirationDate.setHours(newExpirationDate.getHours() + 1); // Token expires in 1 hour

      // Update the user document with the new token and expiration date
      user.emailVerificationToken = newToken;
      user.emailVerificationTokenExpires = newExpirationDate;

      await user.save();

      // Send the new verification email
      await sendEmail({
        to: user.email,
        subject: "Verify your email",
        text: `Please verify your email with this token. The token expires in an hour. ${newToken}`,
      });

      return res.status(HTTPSTATUS.OK).json({
        message:
          "No existing token found. A new token has been sent to your email.",
      });
    }
  } catch (error) {
    if (error instanceof ZodError) {
      next(new ZodValidationException(error));
      return;
    }

    next(error);
  }
};

export const forgotPasswordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body;

  try {
    if (!email) {
      throw new BadRequestException(
        "Email is required!",
        ErrorCodeEnum.VALIDATION_ERROR
      );
    }

    const user = await UserModel.findOne({ email: email });
    console.log("forgot 4");

    if (!user) {
      return res.status(HTTPSTATUS.NOT_FOUND).json({
        message: ErrorCodeEnum.AUTH_USER_NOT_FOUND,
      });
    }

    const passwordResetTokenValue = generateAuthToken();
    console.log("Token value", passwordResetTokenValue);

    Object.assign(user, {
      ...user,
      passwordResetToken: passwordResetTokenValue,
    });

    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Verify your password ret",
      text: `Please reset your password with this token. ${passwordResetTokenValue}`,
    });

    return res
      .status(HTTPSTATUS.OK)
      .json({ message: "Forgot password success. Sent token" });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      next(new ZodValidationException(error));
      return;
    }

    next(error);
  }
};

export const resetPasswordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const validateData = ResetPasswordSchema.parse(req.body);

    const { email, token, newPassword } = validateData;

    // Find the user by email
    const user = await UserModel.findOne({ email });

    if (!user) {
      throw new NotFoundException("User not found!", ErrorCodeEnum.NOT_FOUND);
    }

    // Check if the token matches and is valid
    if (user.passwordResetToken !== token) {
      throw new BadRequestException(
        "Invalid verification token!",
        ErrorCodeEnum.VALIDATION_ERROR
      );
    }

    // Check if token has expired
    const passwordResetTokenExpires = user.passwordResetTokenExpires as Date;
    if (new Date() > passwordResetTokenExpires) {
      throw new BadRequestException(
        "Password reset token has expired!",
        ErrorCodeEnum.AUTH_TOKEN_NOT_FOUND
      );
    }

    // Hash the new password
    const hashedPassword = await hashValue(newPassword);

    // Update user with new password and clear the reset token
    Object.assign(user, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetTokenExpires: null,
    });

    await user.save();

    return res
      .status(HTTPSTATUS.OK)
      .json({ message: "Password reset successfully!" });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      next(new ZodValidationException(error));
      return;
    }

    next(error);
  }
};

export const resendResetPasswordToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body; // Assuming email is provided in the request body

    // Find the user by email
    const user = await UserModel.findOne({ email });

    if (!user) {
      throw new NotFoundException("User not found!", ErrorCodeEnum.NOT_FOUND);
    }

    // Check if the user has a reset password token
    if (user.passwordResetToken) {
      // If the token exists, check if it has expired
      const passwordResetTokenExpires = user.passwordResetTokenExpires as Date;

      if (new Date() > passwordResetTokenExpires) {
        // If the token has expired, generate a new one
        const newToken = generateAuthToken();
        const newExpirationDate = new Date();
        newExpirationDate.setHours(newExpirationDate.getHours() + 1); // Token expires in 1 hour

        // Update the user document with the new token and expiration date
        user.passwordResetToken = newToken;
        user.passwordResetTokenExpires = newExpirationDate;

        await user.save();

        // Send the new reset password email
        await sendEmail({
          to: user.email,
          subject: "Resent password reset token",
          text: `Please use this token to reset your password. The token expires in an hour. ${newToken}`,
        });

        return res.status(HTTPSTATUS.OK).json({
          message:
            "Password reset token expired. A new token has been sent to your email.",
        });
      } else {
        const timeLeft = getTimeLeftBeforeExpiration(passwordResetTokenExpires);

        // If the token is still valid, resend the existing token
        await sendEmail({
          to: user.email,
          subject: "Reset your password",
          text: `Please reset your password with this token. The token expires in ${timeLeft}. ${user.passwordResetToken}`,
        });
        return res.status(HTTPSTATUS.OK).json({
          message:
            "Password reset token is still valid. A new token has been sent to your email.",
        });
      }
    } else {
      // If no token exists, generate a new one
      const newToken = generateAuthToken();
      const newExpirationDate = new Date();
      newExpirationDate.setHours(newExpirationDate.getHours() + 1); // Token expires in 1 hour

      // Update the user document with the new token and expiration date
      user.passwordResetToken = newToken;
      user.passwordResetTokenExpires = newExpirationDate;

      await user.save();

      // Send the new reset password email
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        text: `Please reset your password with this token. The token expires in an hour. ${newToken}`,
      });

      return res.status(HTTPSTATUS.OK).json({
        message:
          "No existing token found. A new token has been sent to your email.",
      });
    }
  } catch (error) {
    if (error instanceof ZodError) {
      next(new ZodValidationException(error));
      return;
    }

    next(error);
  }
};
