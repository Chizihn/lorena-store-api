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
import { OAuth2Client } from "google-auth-library";
import { config } from "../config/app.config";
import passport from "passport";
import { UserDocument } from "../interfaces/user.interface";
import { AuthenticatedRequest } from "../@types/custom.type";

const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);

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

    const userProfile = {
      ...newUser.toObject(),
      providerInfo: newAccount ? newAccount.toObject() : null,
    };

    //Success

    return res.status(HTTPSTATUS.CREATED).json({
      message: "User account created successfully",
      token,
      user: userProfile,
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

    const account = await AccountModel.findOne({
      providerId: validatedData.email,
      provider: ProviderEnum.EMAIL,
    });

    //generate token for user
    const token = generateToken(existingUser._id as string, res);
    console.log("token", token);

    const userProfile = {
      ...existingUser.toObject(),
      providerInfo: account ? account.toObject() : null,
    };

    return res.status(200).json({
      message: "Login successful",
      token,
      user: userProfile,
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

export const googleLoginHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      throw new AppError(
        "Google ID token is required",
        HTTPSTATUS.BAD_REQUEST,
        ErrorCodeEnum.AUTH_TOKEN_NOT_FOUND
      );
    }

    // Verify the token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: config.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      throw new AppError(
        "Invalid Google token",
        HTTPSTATUS.BAD_REQUEST,
        ErrorCodeEnum.AUTH_INVALID_TOKEN
      );
    }

    // Check if user already exists with this email
    let user = await UserModel.findOne({ email: payload.email });
    let account = await AccountModel.findOne({
      provider: ProviderEnum.GOOGLE,
      providerId: payload.sub, // Google's user ID
    });

    // Create user if not exists
    if (!user) {
      user = new UserModel({
        firstName: payload.given_name || "Google",
        lastName: payload.family_name || "User",
        email: payload.email,
        emailVerified: payload.email_verified || false,
        profileImage: payload.picture || null,
      });

      await user.save();
    }

    // Create account if not exists
    if (!account) {
      account = await AccountModel.create({
        userId: user._id,
        provider: ProviderEnum.GOOGLE,
        providerId: payload.sub,
      });
    }

    // Generate token
    const token = generateToken(user._id as string, res);

    return res.status(HTTPSTATUS.OK).json({
      message: "Google login successful",
      token,
      user,
      account,
    });
  } catch (error) {
    next(error);
  }
};

export const googleAuthCallback = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const redirectUrl =
    config.NODE_ENV === "development"
      ? "http://localhost:3000"
      : config.FRONTEND_ORIGIN;

  passport.authenticate(
    "google",
    { session: false },
    (err: Error, user: UserDocument) => {
      if (err || !user) {
        return res.redirect(`${redirectUrl}/login?error=google-auth-failed`);
      }

      // Generate JWT
      const token = generateToken(user._id as string, res);

      // Redirect to frontend
      res.redirect(`${redirectUrl}/auth/success?token=${token}`);
    }
  )(req, res, next);
};

export const linkGoogleAccount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // The user must be logged in to link accounts
    if (!req.user) {
      return res.status(401).json({
        status: "fail",
        message: "You must be logged in to link accounts",
      });
    }

    // Check if this Google account is already linked to another user
    const existingAccount = await AccountModel.findOne({
      provider: "GOOGLE",
      providerId: req.body.providerId,
    });

    if (existingAccount) {
      return res.status(400).json({
        status: "fail",
        message: "This Google account is already linked to another user",
      });
    }

    // Create new account link
    const account = await AccountModel.create({
      userId: req.user?._id,
      provider: "GOOGLE",
      providerId: req.body.providerId,
      refreshToken: req.body.refreshToken || null,
      tokenExpiry: req.body.refreshToken
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        : null,
    });

    res.status(200).json({
      status: "success",
      data: {
        account: {
          provider: account.provider,
          providerId: account.providerId,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Unlink Google account
export const unlinkGoogleAccount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // The user must be logged in to unlink accounts
    if (!req.user) {
      return res.status(401).json({
        status: "fail",
        message: "You must be logged in to unlink accounts",
      });
    }

    // Find and delete the account link
    const account = await AccountModel.findOneAndDelete({
      userId: req.user._id,
      provider: "GOOGLE",
    });

    if (!account) {
      return res.status(404).json({
        status: "fail",
        message: "No linked Google account found",
      });
    }

    res.status(200).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmailHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;

    const validatedData = VerifyEmailSchema.parse(req.body);

    const user = await UserModel.findOne({
      emailVerificationToken: validatedData.token,
      userId,
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

    const expirationWithGracePeriod = new Date(
      emailVerificationTokenExpires?.getTime() + 10 * 60 * 1000
    );

    if (new Date() > expirationWithGracePeriod) {
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

// export const forgotPasswordHandler = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const { email } = req.body;

//   try {
//     if (!email) {
//       throw new BadRequestException(
//         "Email is required!",
//         ErrorCodeEnum.VALIDATION_ERROR
//       );
//     }

//     const user = await UserModel.findOne({ email: email });
//     console.log("forgot 4");

//     if (!user) {
//       return res.status(HTTPSTATUS.NOT_FOUND).json({
//         message: ErrorCodeEnum.AUTH_USER_NOT_FOUND,
//       });
//     }

//     const passwordResetTokenValue = generateAuthToken();
//     console.log("Token value", passwordResetTokenValue);

//     Object.assign(user, {
//       ...user,
//       passwordResetToken: passwordResetTokenValue,
//     });

//     await user.save();

//     await sendEmail({
//       to: user.email,
//       subject: "Verify your password ret",
//       text: `Please reset your password with this token. ${passwordResetTokenValue}`,
//     });

//     return res
//       .status(HTTPSTATUS.OK)
//       .json({ message: "Forgot password success. Sent token" });
//   } catch (error) {
//     // Handle Zod validation errors
//     if (error instanceof ZodError) {
//       next(new ZodValidationException(error));
//       return;
//     }

//     next(error);
//   }
// };

// export const resetPasswordHandler = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const validateData = ResetPasswordSchema.parse(req.body);

//     const { email, token, newPassword } = validateData;

//     // Find the user by email
//     const user = await UserModel.findOne({ email });

//     if (!user) {
//       throw new NotFoundException("User not found!", ErrorCodeEnum.NOT_FOUND);
//     }

//     // Check if the token matches and is valid
//     if (user.passwordResetToken !== token) {
//       throw new BadRequestException(
//         "Invalid verification token!",
//         ErrorCodeEnum.VALIDATION_ERROR
//       );
//     }

//     // Check if token has expired
//     const passwordResetTokenExpires = user.passwordResetTokenExpires as Date;
//     const expirationWithGracePeriod = new Date(
//       passwordResetTokenExpires?.getTime() + 10 * 60 * 1000
//     );

//     if (new Date() > expirationWithGracePeriod) {
//       throw new BadRequestException(
//         "Password reset token has expired!",
//         ErrorCodeEnum.AUTH_TOKEN_NOT_FOUND
//       );
//     }

//     // Hash the new password
//     const hashedPassword = await hashValue(newPassword);

//     // Update user with new password and clear the reset token
//     Object.assign(user, {
//       password: hashedPassword,
//       passwordResetToken: null,
//       passwordResetTokenExpires: null,
//     });

//     await user.save();

//     return res
//       .status(HTTPSTATUS.OK)
//       .json({ message: "Password reset successfully!" });
//   } catch (error) {
//     // Handle Zod validation errors
//     if (error instanceof ZodError) {
//       next(new ZodValidationException(error));
//       return;
//     }

//     next(error);
//   }
// };

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

    // Save the reset token and set expiration date (optional, could be added if needed)
    Object.assign(user, {
      passwordResetToken: passwordResetTokenValue,
      passwordResetTokenExpires: new Date(Date.now() + 15 * 60 * 1000), // Expires in 15 minutes
    });

    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Password Reset Token",
      text: `Please reset your password with this token: ${passwordResetTokenValue}`,
    });

    return res
      .status(HTTPSTATUS.OK)
      .json({ message: "Password reset token sent successfully." });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new ZodValidationException(error));
      return;
    }

    next(error);
  }
};

export const verifyResetTokenHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, token } = req.body;

  try {
    if (!email || !token) {
      throw new BadRequestException(
        "Email and token are required!",
        ErrorCodeEnum.VALIDATION_ERROR
      );
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      throw new NotFoundException("User not found!", ErrorCodeEnum.NOT_FOUND);
    }

    // Check if the token matches
    if (user.passwordResetToken !== token) {
      throw new BadRequestException(
        "Invalid reset token!",
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

    return res.status(HTTPSTATUS.OK).json({
      message: "Token is valid, you can proceed to reset the password.",
    });
  } catch (error) {
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
  const { email, token, newPassword } = req.body;

  try {
    if (!email || !token || !newPassword) {
      throw new BadRequestException(
        "Email, token, and new password are required!",
        ErrorCodeEnum.VALIDATION_ERROR
      );
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      throw new NotFoundException("User not found!", ErrorCodeEnum.NOT_FOUND);
    }

    // Check if the token matches
    if (user.passwordResetToken !== token) {
      throw new BadRequestException(
        "Invalid reset token!",
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
